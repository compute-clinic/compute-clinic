from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, PatientAccessLogViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'patient-access-logs', PatientAccessLogViewSet, basename='patient-access-log')

urlpatterns = [
    path('', include(router.urls)),
]
