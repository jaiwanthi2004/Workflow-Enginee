"""
Seed script - Creates sample workflows with steps and rules.
Run: python3 seed.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from dotenv import load_dotenv

load_dotenv()

from app.database import supabase


def seed():
    print("Seeding sample workflows...")

    # ============================================
    # 1. Expense Approval Workflow
    # ============================================
    wf1 = (
        supabase.table("workflows")
        .insert(
            {
                "name": "Expense Approval",
                "description": "Multi-step expense approval with manager review, finance notification, and CEO approval for high amounts.",
                "version": 1,
                "is_active": True,
                "input_schema": {
                    "amount": {"type": "number", "required": True},
                    "country": {
                        "type": "string",
                        "required": True,
                        "allowed_values": ["US", "UK", "DE", "IN"],
                    },
                    "priority": {
                        "type": "string",
                        "required": True,
                        "allowed_values": ["Low", "Medium", "High"],
                    },
                    "description": {"type": "string", "required": False},
                },
            }
        )
        .execute()
    )
    wf1_id = wf1.data[0]["id"]
    print(f"  Created workflow: Expense Approval ({wf1_id})")

    # Steps
    s1 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf1_id,
                "name": "Manager Approval",
                "step_type": "approval",
                "order": 0,
                "metadata": {
                    "assignee_email": "manager@company.com",
                    "instructions": "Review the expense report",
                },
            }
        )
        .execute()
    )
    s1_id = s1.data[0]["id"]

    s2 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf1_id,
                "name": "Finance Notification",
                "step_type": "notification",
                "order": 1,
                "metadata": {
                    "notification_channel": "email",
                    "template": "finance_review",
                    "recipient": "finance@company.com",
                },
            }
        )
        .execute()
    )
    s2_id = s2.data[0]["id"]

    s3 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf1_id,
                "name": "CEO Approval",
                "step_type": "approval",
                "order": 2,
                "metadata": {
                    "assignee_email": "ceo@company.com",
                    "instructions": "Final approval for high-value expenses",
                },
            }
        )
        .execute()
    )
    s3_id = s3.data[0]["id"]

    s4 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf1_id,
                "name": "Task Completion",
                "step_type": "task",
                "order": 3,
                "metadata": {
                    "action": "mark_expense_approved",
                    "update_database": True,
                },
            }
        )
        .execute()
    )
    s4_id = s4.data[0]["id"]

    s5 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf1_id,
                "name": "Task Rejection",
                "step_type": "task",
                "order": 4,
                "metadata": {
                    "action": "mark_expense_rejected",
                    "notify_requester": True,
                },
            }
        )
        .execute()
    )
    s5_id = s5.data[0]["id"]

    # Set start step
    supabase.table("workflows").update({"start_step_id": s1_id}).eq(
        "id", wf1_id
    ).execute()

    # Rules for Manager Approval step
    supabase.table("rules").insert(
        {
            "step_id": s1_id,
            "condition": "amount > 100 && country == 'US' && priority == 'High'",
            "next_step_id": s2_id,
            "priority": 1,
        }
    ).execute()

    supabase.table("rules").insert(
        {
            "step_id": s1_id,
            "condition": "amount <= 100",
            "next_step_id": s4_id,
            "priority": 2,
        }
    ).execute()

    supabase.table("rules").insert(
        {
            "step_id": s1_id,
            "condition": "priority == 'Low' && country != 'US'",
            "next_step_id": s5_id,
            "priority": 3,
        }
    ).execute()

    supabase.table("rules").insert(
        {"step_id": s1_id, "condition": "DEFAULT", "next_step_id": s5_id, "priority": 4}
    ).execute()

    # Rules for Finance Notification step
    supabase.table("rules").insert(
        {
            "step_id": s2_id,
            "condition": "amount > 500",
            "next_step_id": s3_id,
            "priority": 1,
        }
    ).execute()

    supabase.table("rules").insert(
        {"step_id": s2_id, "condition": "DEFAULT", "next_step_id": s4_id, "priority": 2}
    ).execute()

    # Rules for CEO Approval step
    supabase.table("rules").insert(
        {"step_id": s3_id, "condition": "DEFAULT", "next_step_id": s4_id, "priority": 1}
    ).execute()

    # Terminal rules (DEFAULT -> null to end workflow)
    supabase.table("rules").insert(
        {"step_id": s4_id, "condition": "DEFAULT", "next_step_id": None, "priority": 1}
    ).execute()

    supabase.table("rules").insert(
        {"step_id": s5_id, "condition": "DEFAULT", "next_step_id": None, "priority": 1}
    ).execute()

    print("  Created 5 steps and 9 rules for Expense Approval")

    # ============================================
    # 2. Employee Onboarding Workflow
    # ============================================
    wf2 = (
        supabase.table("workflows")
        .insert(
            {
                "name": "Employee Onboarding",
                "description": "Onboarding process for new employees including IT setup and welcome notification.",
                "version": 1,
                "is_active": True,
                "input_schema": {
                    "employee_name": {"type": "string", "required": True},
                    "department": {
                        "type": "string",
                        "required": True,
                        "allowed_values": ["Engineering", "Marketing", "Sales", "HR"],
                    },
                    "role": {"type": "string", "required": True},
                    "needs_laptop": {"type": "boolean", "required": False},
                },
            }
        )
        .execute()
    )
    wf2_id = wf2.data[0]["id"]
    print(f"  Created workflow: Employee Onboarding ({wf2_id})")

    # Steps
    o1 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf2_id,
                "name": "HR Review",
                "step_type": "approval",
                "order": 0,
                "metadata": {"assignee_email": "hr@company.com"},
            }
        )
        .execute()
    )
    o1_id = o1.data[0]["id"]

    o2 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf2_id,
                "name": "IT Equipment Setup",
                "step_type": "task",
                "order": 1,
                "metadata": {"action": "provision_equipment", "team": "IT"},
            }
        )
        .execute()
    )
    o2_id = o2.data[0]["id"]

    o3 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf2_id,
                "name": "Welcome Notification",
                "step_type": "notification",
                "order": 2,
                "metadata": {
                    "notification_channel": "slack",
                    "template": "welcome_aboard",
                },
            }
        )
        .execute()
    )
    o3_id = o3.data[0]["id"]

    o4 = (
        supabase.table("steps")
        .insert(
            {
                "workflow_id": wf2_id,
                "name": "Onboarding Complete",
                "step_type": "task",
                "order": 3,
                "metadata": {"action": "mark_onboarding_complete"},
            }
        )
        .execute()
    )
    o4_id = o4.data[0]["id"]

    # Set start step
    supabase.table("workflows").update({"start_step_id": o1_id}).eq(
        "id", wf2_id
    ).execute()

    # Rules for HR Review
    supabase.table("rules").insert(
        {
            "step_id": o1_id,
            "condition": "department == 'Engineering'",
            "next_step_id": o2_id,
            "priority": 1,
        }
    ).execute()

    supabase.table("rules").insert(
        {"step_id": o1_id, "condition": "DEFAULT", "next_step_id": o3_id, "priority": 2}
    ).execute()

    # Rules for IT Equipment Setup
    supabase.table("rules").insert(
        {"step_id": o2_id, "condition": "DEFAULT", "next_step_id": o3_id, "priority": 1}
    ).execute()

    # Rules for Welcome Notification
    supabase.table("rules").insert(
        {"step_id": o3_id, "condition": "DEFAULT", "next_step_id": o4_id, "priority": 1}
    ).execute()

    # Terminal rule for Onboarding Complete
    supabase.table("rules").insert(
        {"step_id": o4_id, "condition": "DEFAULT", "next_step_id": None, "priority": 1}
    ).execute()

    print("  Created 4 steps and 5 rules for Employee Onboarding")
    print("\nSeeding complete!")


if __name__ == "__main__":
    seed()
