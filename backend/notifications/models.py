from django.db import models


class StateTimeout(models.Model):
    """
    Model for configuring timeout thresholds for RMA states.
    
    Defines how long an RMA can stay in a particular state before
    being flagged as stale, with different timeouts based on priority.
    """
    class State(models.TextChoices):
        SUBMITTED = 'SUBMITTED', 'Submitted'
        APPROVED = 'APPROVED', 'Approved'
        RECEIVED = 'RECEIVED', 'Received'
        DIAGNOSED = 'DIAGNOSED', 'Diagnosed'
        REPAIRED = 'REPAIRED', 'Repaired'
        REPLACED = 'REPLACED', 'Replaced'
        SHIPPED = 'SHIPPED', 'Shipped'
    
    class Priority(models.TextChoices):
        LOW = 'LOW', 'Low'
        NORMAL = 'NORMAL', 'Normal'
        HIGH = 'HIGH', 'High'
    
    state = models.CharField(
        max_length=20,
        choices=State.choices,
        help_text="RMA state this timeout applies to"
    )
    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        help_text="Priority level this timeout applies to"
    )
    timeout_hours = models.IntegerField(
        help_text="Number of hours before RMA is considered stale in this state"
    )
    
    class Meta:
        unique_together = ('state', 'priority')
        ordering = ['state', 'priority']
        verbose_name = 'State Timeout Configuration'
        verbose_name_plural = 'State Timeout Configurations'
    
    def __str__(self):
        return f"{self.state} ({self.priority}): {self.timeout_hours}h"


class StaleRMARecord(models.Model):
    """
    Track when RMAs become stale and when notifications are sent.
    Prevents duplicate notifications for the same stale period.
    """
    rma = models.ForeignKey(
        'rma.RMA',
        on_delete=models.CASCADE,
        related_name='stale_records'
    )
    state = models.CharField(max_length=20)
    marked_stale_at = models.DateTimeField(auto_now_add=True)
    notification_sent = models.BooleanField(default=False)
    resolved = models.BooleanField(
        default=False,
        help_text="Set to True when RMA moves to next state"
    )
    
    class Meta:
        ordering = ['-marked_stale_at']
        verbose_name = 'Stale RMA Record'
        verbose_name_plural = 'Stale RMA Records'
    
    def __str__(self):
        return f"RMA #{self.rma.rma_number} stale in {self.state}"
