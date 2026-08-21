"""add uppercase FLAGGED CORRECTED enum values

Revision ID: 8b9c0d1e2f3a
Revises: 7a8b9c0d1e2f
Create Date: 2026-08-21 16:38:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '8b9c0d1e2f3a'
down_revision: Union[str, None] = '7a8b9c0d1e2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        # Add uppercase FLAGGED and CORRECTED enum values to match PENDING, VERIFIED, REJECTED
        # Note: The stray lowercase 'flagged' and 'corrected' values added previously remain in Postgres
        # since Postgres enums do not support DROP VALUE.
        op.execute("ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'FLAGGED'")
        op.execute("ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'CORRECTED'")


def downgrade() -> None:
    # Note: Postgres Enum values cannot be removed once added.
    pass
