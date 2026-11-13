from django.urls import path
from django.contrib.auth import views as auth_views

password_reset_patterns = [
    path(
        'password_reset/',
        auth_views.PasswordResetView.as_view(
            subject_template_name='registration/password_reset_subject_en.txt',
            html_email_template_name='registration/password_reset_email_en.html'
        ),
        name='password_reset'
    ),
    path('password_reset/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),
    path('reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),
]