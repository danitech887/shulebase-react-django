import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

import traceback
from django.http import Http404

old_init = Http404.__init__
def new_init(self, *args, **kwargs):
    print("HTTP404 RAISED!")
    traceback.print_stack()
    old_init(self, *args, **kwargs)
Http404.__init__ = new_init

print("Patching done. Making request...")

from django.test import Client
from core.models import Users
from rest_framework_simplejwt.tokens import AccessToken

user = Users.objects.first()
token = str(AccessToken.for_user(user))

c = Client()
res = c.get('/api/students/teacher-portal/reports/subject-aggregated/?subject=Creative%20Arts&grade=Grade%203&stream=A&format=pdf', HTTP_AUTHORIZATION=f"Bearer {token}")
print("STATUS:", res.status_code)
