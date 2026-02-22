# Changelog

All notable changes to RMAinator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-21

### Added
- Complete RMA device tracking system with CRUD operations
- Multi-device RMA submissions with grouping
- File attachment support for RMAs
- State management workflow (SUBMITTED → APPROVED → RECEIVED → DIAGNOSED → REPAIRED/REPLACED → SHIPPED → COMPLETED)
- Email notifications for state changes and approvals
- Complete audit trail with field-level change tracking
- User registration with admin approval workflow
- JWT-based authentication
- **Single Sign-On (SSO)**:
  - Google OAuth with official branding
  - Microsoft OAuth with official branding
  - Session management without admin conflicts
  - Admin approval for new SSO users
- **Multi-Factor Authentication**:
  - TOTP/2FA with QR code generation
  - WebAuthn/FIDO2 passwordless login (Touch ID, Windows Hello, security keys)
- Django admin interface for RMA and user management
- React frontend with responsive design
- RESTful API with comprehensive documentation
- Stale RMA detection system
- Advanced search and filtering

### Testing
- 81 passing tests
- 78% code coverage
- Comprehensive SSO test suite

### Documentation
- Complete README with setup instructions
- Google OAuth setup guide (docs/SSO_TESTING_GUIDE.md)
- Microsoft OAuth setup guide (docs/MICROSOFT_SSO_SETUP.md)
- WebAuthn/2FA setup guide (AUTH_SETUP.md)
- API documentation
- Troubleshooting guides

### Technical Details
- Backend: Django 6.0, Django REST Framework
- Frontend: React 18, Vite
- Database: SQLite (dev), PostgreSQL-ready (prod)
- Authentication: JWT + django-allauth + django-otp + webauthn
- Testing: Django TestCase framework

## [Unreleased]

### Planned
- Auth0 SSO provider (optional)
- Okta SSO provider (optional)
- Admin configuration panel for auth methods
- Password reset via email
- Enhanced dashboard metrics
- Export to Excel/CSV

---

[1.0.0]: https://github.com/losomode/RMAinator/releases/tag/v1.0.0
