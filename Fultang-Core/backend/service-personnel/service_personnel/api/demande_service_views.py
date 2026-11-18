import logging
from uuid import UUID

from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import DemandeService, StatutDemandeService, Service
from .serializers import DemandeServiceSerializer
from .tenant_routing.context import set_tenant_context

logger = logging.getLogger(__name__)

PLATFORM_ROLES = {'PLATFORM_ADMIN', 'PlatformAdmin'}
DIRECTEUR_ROLES = {'Directeur', 'directeur'}
ADMIN_ROLES = {'Admin', 'admin'}


def _roles(request):
    user = getattr(request, 'user', None)
    if user is None or not getattr(user, 'roles', None):
        return []
    return list(user.roles)


def _is_platform_admin(request):
    return bool(PLATFORM_ROLES.intersection(_roles(request)))


def _is_directeur(request):
    return bool(DIRECTEUR_ROLES.intersection(_roles(request)))


def _is_admin_local(request):
    return bool(ADMIN_ROLES.intersection(_roles(request)))


class DemandeServiceViewSet(viewsets.ModelViewSet):
    """
    Workflow demande de service hospitalier (tenant → directeur → CompuClinic).
    """
    serializer_class = DemandeServiceSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        qs = DemandeService.objects.all()
        if _is_platform_admin(self.request):
            statut = self.request.query_params.get('statut')
            if statut:
                qs = qs.filter(statut=statut)
            return qs
        tenant_id = getattr(self.request.user, 'tenant_id', None)
        if tenant_id:
            qs = qs.filter(tenant_id=tenant_id)
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def create(self, request, *args, **kwargs):
        if not _is_admin_local(request):
            return Response(
                {'detail': 'Seul l\'administrateur local (informaticien) peut soumettre une demande.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = request.data.copy()
        tenant_id = getattr(request.user, 'tenant_id', None)
        nom = (data.get('nom_service_propose') or '').strip()
        if not nom:
            return Response({'nom_service_propose': ['Ce champ est obligatoire.']}, status=status.HTTP_400_BAD_REQUEST)

        demandeur_email = (data.get('demandeur_email') or '').strip()
        if not demandeur_email:
            from .models import Admin
            try:
                admin = Admin.objects.get(id_personnel=UUID(str(request.user.id)))
                demandeur_email = admin.email
            except (Admin.DoesNotExist, ValueError):
                demandeur_email = ''

        instance = DemandeService.objects.create(
            tenant_id=UUID(str(tenant_id)) if tenant_id else None,
            nom_service_propose=nom,
            desc_service=data.get('desc_service', ''),
            code_analytique_propose=data.get('code_analytique_propose', ''),
            commentaire_admin=data.get('commentaire_admin', ''),
            statut=StatutDemandeService.SOUMISE,
            demandeur_id=UUID(str(request.user.id)),
            demandeur_email=demandeur_email,
        )
        return Response(DemandeServiceSerializer(instance).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        return Response({'detail': 'Modification directe interdite.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Suppression interdite.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    @action(detail=True, methods=['post'], url_path='signer-directeur')
    def signer_directeur(self, request, pk=None):
        if not _is_directeur(request):
            return Response({'detail': 'Signature réservée au directeur.'}, status=status.HTTP_403_FORBIDDEN)
        demande = self.get_object()
        if demande.statut != StatutDemandeService.SOUMISE:
            return Response({'detail': 'Demande déjà traitée ou en cours ailleurs.'}, status=status.HTTP_400_BAD_REQUEST)
        demande.statut = StatutDemandeService.SIGNEE_DIRECTEUR
        demande.signature_directeur_id = UUID(str(request.user.id))
        demande.commentaire_directeur = request.data.get('commentaire_directeur', '')
        demande.date_signature_directeur = timezone.now()
        demande.save()
        return Response(DemandeServiceSerializer(demande).data)

    @action(detail=True, methods=['post'], url_path='envoyer-plateforme')
    def envoyer_plateforme(self, request, pk=None):
        if not _is_admin_local(request):
            return Response({'detail': 'Envoi réservé à l\'administrateur local.'}, status=status.HTTP_403_FORBIDDEN)
        demande = self.get_object()
        if demande.statut != StatutDemandeService.SIGNEE_DIRECTEUR:
            return Response(
                {'detail': 'La demande doit être signée par le directeur avant envoi à CompuClinic.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        demande.statut = StatutDemandeService.ENVOYEE_PLATEFORME
        demande.date_envoi_plateforme = timezone.now()
        demande.save()
        return Response(DemandeServiceSerializer(demande).data)

    @action(detail=True, methods=['post'], url_path='approuver')
    def approuver(self, request, pk=None):
        if not _is_platform_admin(request):
            return Response(
                {'detail': 'Approbation réservée au gestionnaire plateforme CompuClinic.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        demande = self.get_object()
        if demande.statut != StatutDemandeService.ENVOYEE_PLATEFORME:
            return Response({'detail': 'Demande non prête pour approbation plateforme.'}, status=status.HTTP_400_BAD_REQUEST)

        if demande.tenant_id:
            set_tenant_context(str(demande.tenant_id))

        code = demande.code_analytique_propose or f"SVC-{demande.id_demande}"
        service = Service.objects.create(
            nom_service=demande.nom_service_propose,
            code_analytique=code,
            desc_service=demande.desc_service or '',
        )
        demande.statut = StatutDemandeService.APPROUVEE
        demande.service_cree_id = service.id_service
        demande.date_traitement_plateforme = timezone.now()
        demande.save()

        if demande.demandeur_email:
            try:
                send_mail(
                    subject=f"[CompuClinic] Service « {service.nom_service} » créé",
                    message=(
                        f"Bonjour,\n\nLe service « {service.nom_service} » a été créé sur votre établissement.\n"
                        f"Vous pouvez informer le responsable RH pour recruter et affecter du personnel.\n\n"
                        f"— CompuClinic / Fultang"
                    ),
                    from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@compuclinic.local'),
                    recipient_list=[demande.demandeur_email],
                    fail_silently=True,
                )
            except Exception as exc:
                logger.warning('Notification email demande service: %s', exc)

        return Response({
            **DemandeServiceSerializer(demande).data,
            'service_cree': {'id': service.id_service, 'nom': service.nom_service},
        })

    @action(detail=True, methods=['post'], url_path='rejeter')
    def rejeter(self, request, pk=None):
        roles = _roles(request)
        if not (_is_platform_admin(request) or _is_directeur(request)):
            return Response({'detail': 'Non autorisé.'}, status=status.HTTP_403_FORBIDDEN)
        demande = self.get_object()
        demande.statut = StatutDemandeService.REJETEE
        demande.motif_rejet = request.data.get('motif_rejet', '')
        demande.date_traitement_plateforme = timezone.now()
        demande.save()
        return Response(DemandeServiceSerializer(demande).data)
