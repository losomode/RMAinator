"""
Management command to set up modern admin interface theme.
"""
from django.core.management.base import BaseCommand
from admin_interface.models import Theme


class Command(BaseCommand):
    help = 'Configure modern admin interface theme for RMAinator'

    def handle(self, *args, **options):
        # Get or create the default theme
        theme, created = Theme.objects.get_or_create(pk=1)
        
        # Modern color scheme
        theme.name = 'RMAinator Modern'
        theme.active = True
        
        # Title and branding
        theme.title = 'RMAinator Admin'
        theme.title_visible = True
        theme.title_color = '#FFFFFF'
        
        # Logo settings
        theme.logo_visible = True
        theme.logo_max_height = 50
        
        # Header colors - Modern blue/teal
        theme.css_header_background_color = '#1976D2'  # Material blue
        theme.css_header_text_color = '#FFFFFF'
        theme.css_header_link_color = '#FFFFFF'
        theme.css_header_link_hover_color = '#B3E5FC'
        
        # Module colors (app sections)
        theme.css_module_background_color = '#FFFFFF'
        theme.css_module_text_color = '#333333'
        theme.css_module_link_color = '#1976D2'
        theme.css_module_link_hover_color = '#0D47A1'
        theme.css_module_rounded_corners = True
        
        # Button colors
        theme.css_save_button_background_color = '#4CAF50'  # Green
        theme.css_save_button_background_hover_color = '#388E3C'
        theme.css_save_button_text_color = '#FFFFFF'
        
        theme.css_delete_button_background_color = '#F44336'  # Red
        theme.css_delete_button_background_hover_color = '#C62828'
        theme.css_delete_button_text_color = '#FFFFFF'
        
        # Generic link colors
        theme.css_generic_link_color = '#1976D2'
        theme.css_generic_link_hover_color = '#0D47A1'
        theme.css_generic_link_active_color = '#0D47A1'
        
        # List filter
        theme.list_filter_dropdown = True
        theme.list_filter_sticky = True
        theme.list_filter_highlight = True
        theme.list_filter_removal_links = True
        
        # Recent actions
        theme.recent_actions_visible = True
        
        # Related modal
        theme.related_modal_active = True
        theme.related_modal_background_opacity = 0.3
        theme.related_modal_rounded_corners = True
        theme.related_modal_close_button_visible = True
        
        # Form options
        theme.form_pagination_sticky = True
        theme.form_submit_sticky = True
        theme.show_fieldsets_as_tabs = False
        theme.show_inlines_as_tabs = False
        
        # Language chooser
        theme.language_chooser_active = False
        
        # Environment badge (optional)
        theme.env_name = 'Development'
        theme.env_visible_in_header = True
        theme.env_color = '#FF9800'  # Orange for dev
        
        # Foldable apps in sidebar
        theme.foldable_apps = True
        
        theme.save()
        
        action = 'Created' if created else 'Updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'{action} modern admin theme for RMAinator!\n'
                'Visit /admin/ to see the new interface.'
            )
        )
