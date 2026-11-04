import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { messageFrom } from "../../lib/errors";
import { Button, Message } from "../../app/ui/form";
import { unwrap } from "../classes/api";
import { pairingChannel } from "./channel";

type PairingState = {
  claimed_at: string | null;
  device_label: string | null;
  ready_at: string | null;
  revoked_at: string | null;
};

type Created = {
  pairing_id: string;
  token: string;
  code: string;
  expires_at: string;
  replaced: boolean;
};

/**
 * The laptop's side of connecting a phone (PHASE_6 § 3): a QR code and a short code, where to
 * put the phone, the phone's live preview, and "ready" once its view is set up. Making a new code
 * replaces any phone connected before (create_pairing revokes it).
 */
export function PhonePairing({
  testId,
  onReady,
}: {
  testId: string;
  onReady: (pairingId: string) => void;
}) {
  const [created, setCreated] = useState<Created | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const create = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.rpc("create_pairing", { p_test_id: testId })) as unknown as Created,
    onSuccess: async (c) => {
      setCreated(c);
      setPreview(null);
      setQr(
        await QRCode.toDataURL(`${window.location.origin}/pair/${c.token}`, {
          margin: 1,
          width: 220,
        }),
      );
    },
  });

  // Where the pairing stands: claimed, by what, and ready.
  const pairing = useQuery({
    queryKey: ["pairing", created?.pairing_id],
    enabled: !!created,
    refetchInterval: (q) => (q.state.data?.ready_at ? false : 2000),
    queryFn: async (): Promise<PairingState> =>
      unwrap(
        await supabase
          .from("device_pairings")
          .select("claimed_at, device_label, ready_at, revoked_at")
          .eq("id", created!.pairing_id)
          .single(),
      ),
  });

  // The phone's live preview during setup.
  useEffect(() => {
    if (!created) return;
    const channel = pairingChannel(supabase, created.pairing_id, "laptop", {
      onMessage: (m) => {
        if (m.event === "preview") setPreview(m.image);
      },
    });
    return () => void supabase.removeChannel(channel);
  }, [created]);

  const ready = !!pairing.data?.ready_at;
  useEffect(() => {
    if (ready && created) onReady(created.pairing_id);
  }, [ready, created, onReady]);

  // Expired once its five minutes pass without a phone claiming it.
  const [expiredFor, setExpiredFor] = useState<string | null>(null);
  useEffect(() => {
    if (!created) return;
    const timer = setTimeout(
      () => setExpiredFor(created.pairing_id),
      Math.max(0, Date.parse(created.expires_at) - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [created]);
  const expired = !!created && expiredFor === created.pairing_id && !pairing.data?.claimed_at;

  if (!created) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-text-muted">
          This test uses your phone as a side camera. You'll need it on a stand or propped up, and
          plugged in if you can.
        </p>
        <Button onClick={() => create.mutate()} disabled={create.isPending}>
          Connect my phone
        </Button>
        {create.isError && <Message kind="error">{messageFrom(create.error)}</Message>}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        {!pairing.data?.claimed_at ? (
          <>
            {qr && (
              <img
                src={qr}
                alt="QR code to open the phone camera page"
                className="h-48 w-48 rounded bg-white p-1"
              />
            )}
            <p className="text-sm">
              Scan this with your phone's camera, or open{" "}
              <strong>{window.location.host}/pair</strong> and type{" "}
              <strong className="font-mono tracking-widest">{created.code}</strong>.
            </p>
            {expired && <Message kind="error">This code has expired.</Message>}
          </>
        ) : (
          <p className="text-sm">
            Phone connected{pairing.data.device_label ? `: ${pairing.data.device_label}` : ""}.
            {!ready && " Now set it up as shown on the phone."}
          </p>
        )}
        <Button variant="plain" onClick={() => create.mutate()} disabled={create.isPending}>
          {pairing.data?.claimed_at ? "Use a different phone" : "Make a new code"}
        </Button>
      </div>
      <div className="space-y-2 text-sm text-text-muted">
        <p>
          Put the phone to your left or right, about an arm and a half away, angled so it sees your
          hands, keyboard and screen.
        </p>
        {preview ? (
          <img src={preview} alt="What your phone sees" className="w-full rounded-lg" />
        ) : (
          pairing.data?.claimed_at && <p>Waiting for the phone's picture…</p>
        )}
        {ready && <p className="font-medium text-accent">The phone is set up.</p>}
      </div>
    </div>
  );
}
