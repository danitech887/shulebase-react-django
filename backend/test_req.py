import os
import sys

# Setup django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.test import Client
from core.models import Users
from rest_framework_simplejwt.tokens import AccessToken

user = Users.objects.first()
token = str(AccessToken.for_user(user))

c = Client()
res = c.get('/api/students/teacher-portal/reports/subject-aggregated/?subject=Creative%20Arts&grade=Grade%203&stream=A&format=pdf', HTTP_AUTHORIZATION=f"Bearer {token}")
print("STATUS CODE:", res.status_code)
print("CONTENT TYPE:", res.get('Content-Type'))
print("BODY:", res.content)
