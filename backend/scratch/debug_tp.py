import os
import django
from django.test import Client
from datetime import datetime

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from core.models import Users
from rest_framework_simplejwt.tokens import AccessToken

user = Users.objects.filter(role='Teacher').first()
if not user:
    user = Users.objects.first()

token = str(AccessToken.for_user(user))
c = Client()

print(f"Testing for user: {user.username} ({user.role})")

endpoints = [
    '/api/students/teacher-portal/teaching-progress/',
    '/api/students/teacher-portal/teaching-progress/?term=Term 1',
    '/api/students/teachers/teaching-progress/',
]

for url in endpoints:
    print(f"\nRequesting: {url}")
    res = c.get(url, HTTP_AUTHORIZATION=f"Bearer {token}")
    print("STATUS CODE:", res.status_code)
    if res.status_code != 200:
        print("ERROR BODY:", res.content.decode()[:500])
