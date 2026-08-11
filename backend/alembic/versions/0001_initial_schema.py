"""initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2026-08-11 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    if "species" not in existing_tables:
        op.create_table(
            "species",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("common_name", sa.String(), nullable=False),
            sa.Column("scientific_name", sa.String(), nullable=False),
            sa.Column("category", sa.String(), nullable=True),
        )

    if "observations" not in existing_tables:
        op.create_table(
            "observations",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("observer_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("species_common", sa.String(), nullable=True),
            sa.Column("species_scientific", sa.String(), nullable=True),
            sa.Column("lat", sa.Float(), nullable=True),
            sa.Column("lng", sa.Float(), nullable=True),
            sa.Column("image_url", sa.String(), nullable=True),
            sa.Column("confidence_score", sa.Float(), nullable=True),
            sa.Column("verification_status", sa.String(), nullable=True),
            sa.Column("observed_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade() -> None:
    bind = op.get_bind()
    existing_tables = set(sa.inspect(bind).get_table_names())

    if "observations" in existing_tables:
        op.drop_table("observations")
    if "species" in existing_tables:
        op.drop_table("species")
    if "users" in existing_tables:
        op.drop_table("users")