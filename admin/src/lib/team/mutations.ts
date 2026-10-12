import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { StaffRole } from "@nextera/contracts";
import {
  changeStaffRole,
  inviteStaff,
  resetStaffCredentials,
  setStaffDisabled,
} from "@/app/(console)/staff/actions";
import type { IssuedCredentials } from "@/app/(console)/staff/actions";
import { isNavigationError, runAction } from "@/lib/actions/navigation";
import { unwrapOutcome } from "@/lib/actions/outcome";
import { ONE_TIME_GC_MS, syncStaffMember } from "./cache";

export function useInviteStaff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => unwrapOutcome(await runAction(() => inviteStaff(formData))),
    onSuccess: (issued: IssuedCredentials) => syncStaffMember(queryClient, issued.staff),
    gcTime: ONE_TIME_GC_MS,
    throwOnError: isNavigationError,
  });
}

export function useResetCredentials(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => unwrapOutcome(await runAction(() => resetStaffCredentials(id))),
    onSuccess: (issued: IssuedCredentials) => syncStaffMember(queryClient, issued.staff),
    gcTime: ONE_TIME_GC_MS,
    throwOnError: isNavigationError,
  });
}

export function useChangeStaffRole(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (role: StaffRole) => unwrapOutcome(await runAction(() => changeStaffRole(id, role))),
    onSuccess: (member) => syncStaffMember(queryClient, member),
    throwOnError: isNavigationError,
  });
}

export function useStaffAccess(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (disabled: boolean) => unwrapOutcome(await runAction(() => setStaffDisabled(id, disabled))),
    onSuccess: (member) => syncStaffMember(queryClient, member),
    throwOnError: isNavigationError,
  });
}
