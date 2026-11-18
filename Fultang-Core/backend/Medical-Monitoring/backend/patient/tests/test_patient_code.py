from datetime import date
from django.test import TestCase

from patient.models import Patient
from patient.patient_code import generate_patient_code, _initials_from_name


class PatientCodeGenerationTests(TestCase):
    def test_initials_from_nom(self):
        self.assertEqual(_initials_from_name("Mbarga", "Jean"), "MB")
        self.assertEqual(_initials_from_name("A", "Paul"), "AP")

    def test_generate_unique_codes_same_day(self):
        p1 = Patient.objects.create(
            nom="Dupont",
            prenom="Alice",
            sexe="F",
            date_naissance=date(1990, 1, 1),
            statut_matrimonial="CELIBATAIRE",
            numero_securite_sociale="TEST-CODE-001",
            code_identifiant=generate_patient_code("Dupont", "Alice"),
        )
        code2 = generate_patient_code("Dupont", "Bob")
        self.assertNotEqual(p1.code_identifiant, code2)
        self.assertTrue(code2.startswith("DU-CC-"))
        self.assertIn("-001", p1.code_identifiant)
