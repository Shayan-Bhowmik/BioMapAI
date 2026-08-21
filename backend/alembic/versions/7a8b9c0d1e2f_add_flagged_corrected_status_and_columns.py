"""add flagged corrected status and columns

Revision ID: 7a8b9c0d1e2f
Revises: 51c6faf0ea13
Create Date: 2026-08-21 11:58:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a8b9c0d1e2f'
down_revision: Union[str, None] = '51c6faf0ea13'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'flagged'")
        op.execute("ALTER TYPE verification_status_enum ADD VALUE IF NOT EXISTS 'corrected'")

    # Add new columns to observations table
    op.add_column('observations', sa.Column('flagged_reason', sa.Text(), nullable=True))
    op.add_column('observations', sa.Column('suggested_species_common', sa.String(length=200), nullable=True))
    op.add_column('observations', sa.Column('suggested_species_scientific', sa.String(length=200), nullable=True))


def downgrade() -> None:
    # Note: Postgres Enum values cannot be removed once added.
    # We only drop the added columns on downgrade.
    op.drop_column('observations', 'suggested_species_scientific')
    op.drop_column('observations', 'suggested_species_common')
    op.drop_column('observations', 'flagged_reason')
