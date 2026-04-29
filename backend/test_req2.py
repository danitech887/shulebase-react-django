import os
import sys

# Setup django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
import django
django.setup()

from django.urls import resolve
try:
    m = resolve('/api/students/teacher-portal/reports/subject-aggregated/')
    print("MATCHED VIEW:", m.func)
    print("MODULE:", getattr(m.func, '__module__', 'No module'))
    print("NAME:", getattr(m.func, '__name__', 'No name'))
    if hasattr(m.func, 'cls'):
        print("CLS:", m.func.cls)
        print("CLS MODULE:", m.func.cls.__module__)
except Exception as e:
    print(e)
