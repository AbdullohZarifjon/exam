import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Key, MagnifyingGlass, Plus, ShieldCheck } from "@phosphor-icons/react";

import { Button, Card, EmptyState, Field, Input, Modal, Select, Spinner } from "../shared/ui";
import {
  useCreateStaffUser,
  useResetStaffPassword,
  useStaffUsers,
} from "../features/auth/hooks/auth.hooks";
import {
  createStaffSchema,
  resetPasswordSchema,
  type CreateStaffInput,
  type ResetPasswordInput,
} from "../features/auth/model/auth.schema";
import type { PublicUser } from "../app/store/auth.store";
import { formatRelative } from "../shared/lib/format";

/**
 * Admin-only staff management. Staff accounts can never be created
 * from outside (no public registration): the first admin comes from
 * the backend ADMIN / ADMIN_PASSWORD env bootstrap, and every
 * teacher — or further admin — is created here. Password resets
 * for staff users are also admin-only.
 */
const PAGE_SIZE = 12;

export function StaffPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useStaffUsers();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<PublicUser | null>(null);

  // Staff lists are small (admins/teachers only), so search + paging
  // run client-side over the already-fetched list.
  const all = data?.data ?? [];
  const q = search.trim().toLowerCase();
  const filtered = q
    ? all.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      )
    : all;
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const from = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const to = (safePage - 1) * PAGE_SIZE + items.length;

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">{t("staff.title")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("staff.subtitle")}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={14} weight="bold" />
          {t("staff.new")}
        </Button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-sm">
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t("staff.search.placeholder")}
            aria-label={t("staff.search.label")}
            className="pl-9"
          />
          <MagnifyingGlass size={15} weight="bold" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9BB8]" />
        </div>
        <p className="text-xs text-text-muted">{!isLoading && filtered.length > 0 ? `${from}–${to} ${t("students.pagination.of")} ${filtered.length}` : ""}</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center text-[#8A9BB8]">
          <Spinner />
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          title={t("staff.emptyTitle")}
          description={t("staff.emptyDescription")}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus size={14} weight="bold" />
              {t("staff.new")}
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("staff.noResults.title")}
          description={t("staff.noResults.description")}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((u) => (
              <StaffCard key={u.id} user={u} onReset={() => setResetTarget(u)} />
            ))}
          </div>
          {pages > 1 ? (
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("students.pagination.prev")}
              </Button>
              <span className="text-xs text-text-muted">{t("students.pagination.page", { page: safePage, pages })}</span>
              <Button
                variant="ghost"
                size="sm"
                disabled={safePage >= pages}
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
              >
                {t("students.pagination.next")}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <NewStaffModal open={open} onClose={() => setOpen(false)} />
      {resetTarget ? (
        <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)} />
      ) : null}
    </div>
  );
}

function StaffCard({ user, onReset }: { user: PublicUser; onReset: () => void }) {
  const { t } = useTranslation();
  const isAdmin = user.role === "admin";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{user.fullName}</p>
          <p className="mt-0.5 truncate font-mono text-xs text-text-muted">@{user.username}</p>
        </div>
        <span
          className={
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold " +
            (isAdmin
              ? "bg-navy-900 text-white"
              : "border border-accent/25 bg-accent-soft text-accent")
          }
        >
          {isAdmin ? <ShieldCheck size={12} weight="fill" /> : null}
          {isAdmin ? t("staff.roleAdmin") : t("staff.roleTeacher")}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-[#8A9BB8]">
          {formatRelative(user.createdAt)}
        </p>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-[#8A9BB8] hover:bg-bg hover:text-accent"
        >
          <Key size={14} />
          {t("staff.resetPassword")}
        </button>
      </div>
    </Card>
  );
}

function NewStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const create = useCreateStaffUser();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: { role: "teacher" },
  });

  return (
    <Modal open={open} onClose={onClose} title={t("staff.create.title")}>
      <form
        onSubmit={handleSubmit((d) =>
          create.mutate(d, {
            onSuccess: () => {
              reset();
              onClose();
            },
          }),
        )}
        className="flex flex-col gap-4"
      >
        <Field label={t("staff.fullName")} required error={errors.fullName?.message}>
          <Input autoComplete="off" {...register("fullName")} />
        </Field>
        <Field
          label="Username"
          required
          error={errors.username?.message}
          hint={t("staff.usernameHint")}
        >
          <Input autoComplete="off" {...register("username")} />
        </Field>
        <Field label={t("staff.password")} required error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <Field label={t("staff.role")} error={errors.role?.message}>
          <Select {...register("role")}>
            <option value="teacher">{t("staff.roleTeacher")}</option>
            <option value="admin">{t("staff.roleAdmin")}</option>
          </Select>
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("staff.cancel")}
          </Button>
          <Button type="submit" loading={create.isPending}>
            {t("staff.create.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: PublicUser; onClose: () => void }) {
  const { t } = useTranslation();
  const resetPassword = useResetStaffPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  return (
    <Modal
      open
      onClose={onClose}
      title={t("staff.reset.title")}
      description={t("staff.reset.subtitle", { username: user.username })}
    >
      <form
        onSubmit={handleSubmit((d) =>
          resetPassword.mutate({ id: user.id, body: d }, { onSuccess: onClose }),
        )}
        className="flex flex-col gap-4"
      >
        <Field label={t("staff.newPassword")} required error={errors.password?.message}>
          <Input type="password" autoComplete="new-password" {...register("password")} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={resetPassword.isPending}>
            {t("staff.cancel")}
          </Button>
          <Button type="submit" loading={resetPassword.isPending}>
            {t("staff.reset.submit")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
