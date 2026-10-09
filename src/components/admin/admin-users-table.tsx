"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { ROLE_OPTIONS } from "@/lib/roles";
import { FormAlert } from "@/components/ui/form-fields";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  pending: boolean;
  createdAtLabel: string;
};

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function call(id: string, init: RequestInit, url?: string) {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(url ?? `/api/admin/users/${id}`, {
        headers: { "Content-Type": "application/json" },
        ...init,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "No se pudo completar la acción.");
        return false;
      }
      setMessage(body.message ?? "Listo.");
      router.refresh();
      return true;
    } catch {
      setError("Error de conexión. Intenta nuevamente.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  function changeRole(id: string, role: string) {
    void call(id, { method: "PATCH", body: JSON.stringify({ role }) });
  }

  function toggleActive(id: string, active: boolean) {
    void call(id, { method: "PATCH", body: JSON.stringify({ active }) });
  }

  function resendInvite(id: string) {
    void call(id, { method: "POST" }, `/api/admin/users/${id}/resend-invite`);
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`¿Eliminar a ${name}? Esta acción no se puede deshacer.`))
      return;
    await call(id, { method: "DELETE" });
  }

  return (
    <div>
      {message ? (
        <div className="mb-4">
          <FormAlert type="success">{message}</FormAlert>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4">
          <FormAlert type="error">{error}</FormAlert>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-edra-grey/20 text-xs uppercase tracking-wide text-edra-grey">
              <th className="py-3 pr-4 font-medium">Nombre</th>
              <th className="py-3 pr-4 font-medium">Correo</th>
              <th className="py-3 pr-4 font-medium">Rol</th>
              <th className="py-3 pr-4 font-medium">Estado</th>
              <th className="py-3 pr-4 font-medium">Registro</th>
              <th className="py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isSelf = u.id === currentUserId;
              const busy = busyId === u.id;
              return (
                <tr
                  key={u.id}
                  className="border-b border-edra-grey/10 align-middle text-edra-ink"
                >
                  <td className="py-3 pr-4">
                    {u.name}
                    {isSelf ? (
                      <span className="ml-2 text-xs text-edra-grey">(tú)</span>
                    ) : null}
                  </td>
                  <td className="py-3 pr-4 text-edra-grey">{u.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      disabled={isSelf || busy}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-full border border-edra-grey/30 bg-white px-3 py-1 text-xs text-edra-ink disabled:opacity-50"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    {!u.active ? (
                      <span className="text-xs font-medium text-red-500">
                        Inactivo
                      </span>
                    ) : u.pending ? (
                      <span className="text-xs font-medium text-amber-600">
                        Pendiente
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600">
                        Activo
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-edra-grey">
                    {u.createdAtLabel}
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {u.role !== "ADMIN" ? (
                        <Link
                          href={`/admin/usuarios/${u.id}`}
                          className="rounded-full border border-edra px-3 py-1 text-xs font-medium text-edra hover:bg-edra hover:text-white"
                        >
                          Editar
                        </Link>
                      ) : null}
                      {u.pending ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => resendInvite(u.id)}
                          className="rounded-full border border-edra px-3 py-1 text-xs font-medium text-edra hover:bg-edra hover:text-white disabled:opacity-50"
                        >
                          Reenviar accesos
                        </button>
                      ) : null}
                      {!isSelf ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleActive(u.id, !u.active)}
                          className="rounded-full border border-edra-grey/40 px-3 py-1 text-xs font-medium text-edra-grey hover:bg-edra-grey/10 disabled:opacity-50"
                        >
                          {u.active ? "Desactivar" : "Activar"}
                        </button>
                      ) : null}
                      {!isSelf ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => remove(u.id, u.name)}
                          className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
