from rest_framework import serializers
from patient.audit import PatientAccessLog


class PatientAccessLogSerializer(serializers.ModelSerializer):
    action_label = serializers.CharField(source="get_action_display", read_only=True)

    class Meta:
        model = PatientAccessLog
        fields = [
            "id",
            "patient",
            "patient_code",
            "patient_nom",
            "user_id",
            "user_roles",
            "action",
            "action_label",
            "resource",
            "created_at",
        ]
        read_only_fields = fields
