import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { syncConversion, syncLead } from "@/lib/leads/cache";
import { queryKeys } from "@/lib/queries/keys";
import { leadKeys } from "@/lib/queries/leads";
import { supportKeys } from "@/lib/queries/support";
import { syncReply, syncTicket } from "@/lib/support/cache";
import { customerMessage, customerProfile, lead, leadId, ticket, ticketDetail, ticketId } from "@/test/desk";

function setup() {
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();
  const keys = () => invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  return { queryClient, keys };
}

describe("lead cache sync", () => {
  it("writes the updated lead and refreshes every list page", async () => {
    const { queryClient, keys } = setup();
    const updated = { ...lead, status: "contacted" as const };

    await syncLead(queryClient, updated);
    expect(queryClient.getQueryData(leadKeys.detail(leadId))).toEqual({ lead: updated });
    expect(keys()).toEqual([leadKeys.lists(), leadKeys.detail(leadId)]);
  });

  it("also refreshes customers after a conversion", async () => {
    const { queryClient, keys } = setup();

    await syncConversion(queryClient, { lead: { ...lead, status: "converted" }, customer: customerProfile, created: true });
    expect(keys()).toContainEqual(queryKeys.customers.all);
    expect(keys()).toContainEqual(leadKeys.lists());
    expect(keys()).not.toContainEqual(queryKeys.session.all);
  });
});

describe("ticket cache sync", () => {
  it("merges the updated ticket into the cached detail", async () => {
    const { queryClient, keys } = setup();
    queryClient.setQueryData(supportKeys.detail(ticketId), ticketDetail);

    await syncTicket(queryClient, { ...ticket, priority: "urgent" });
    expect(queryClient.getQueryData<typeof ticketDetail>(supportKeys.detail(ticketId))?.ticket.priority).toBe("urgent");
    expect(queryClient.getQueryData<typeof ticketDetail>(supportKeys.detail(ticketId))?.messages).toHaveLength(1);
    expect(keys()).toEqual([supportKeys.lists(), supportKeys.detail(ticketId)]);
  });

  it("appends a reply once", async () => {
    const { queryClient } = setup();
    queryClient.setQueryData(supportKeys.detail(ticketId), ticketDetail);
    const message = { ...customerMessage, id: "9e3f4a6b-7c8d-4e9f-8a1b-2c3d4e5f6a00", authorType: "staff" as const };
    const result = { ticket: { ...ticket, status: "pending_customer" as const }, message };

    await syncReply(queryClient, result);
    await syncReply(queryClient, result);
    const cached = queryClient.getQueryData<typeof ticketDetail>(supportKeys.detail(ticketId));
    expect(cached?.messages.map((item) => item.id)).toEqual([customerMessage.id, message.id]);
    expect(cached?.ticket.status).toBe("pending_customer");
  });

  it("leaves an uncached detail alone", async () => {
    const { queryClient } = setup();
    await syncTicket(queryClient, ticket);
    expect(queryClient.getQueryData(supportKeys.detail(ticketId))).toBeUndefined();
  });
});
