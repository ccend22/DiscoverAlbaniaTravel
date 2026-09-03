"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { BrowserCodeReader, BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { validateTicketAction } from "@/app/vendor/(dashboard)/scanner/actions";
import type { TicketValidationResult } from "@/db/queries/vendors";
import { Button } from "@/components/ui/button";
import { AlertCircleIcon, CameraIcon, CheckCircleIcon, QrCodeIcon } from "@/components/icons";
import { formatAlbaniaDateTime } from "@/lib/timezone";

type CameraState = "idle" | "starting" | "active" | "error";

const STATUS_COPY: Record<TicketValidationResult["status"], { title: string; body: string; tone: "success" | "warning" | "danger" | "neutral" }> = {
  valid: { title: "Bileta e vlefshme", body: "Udhëtari u regjistrua me sukses.", tone: "success" },
  valid_off_hours: { title: "Bileta e vlefshme — jashtë orarit të planifikuar", body: "Udhëtari u regjistrua, por ky skanim është dukshëm jashtë orarit të planifikuar të hipjes. Ia vlen një kontroll shtesë.", tone: "warning" },
  already_used: { title: "Tashmë e vlefshme", body: "Kjo biletë është përdorur tashmë.", tone: "warning" },
  too_early: { title: "Shumë herët", body: "Kjo biletë bëhet e vlefshme në datën e saj të udhëtimit.", tone: "warning" },
  expired: { title: "Bileta ka skaduar", body: "Data e udhëtimit ka kaluar.", tone: "danger" },
  cancelled: { title: "Rezervimi u anullua", body: "Mos e ngjit këtë udhëtar me këtë biletë.", tone: "danger" },
  unpaid: { title: "Pagesa nuk është konfirmuar", body: "Arkëto ose konfirmo pagesën përpara se ta vlefshmërosh këtë biletë.", tone: "warning" },
  wrong_route: { title: "Linjë e gabuar", body: "Kjo biletë është rezervuar për një linjë tjetër. Mos e ngjit këtu.", tone: "neutral" },
  wrong_operator: { title: "Linjë tjetër", body: "Kjo biletë i përket linjës së një operatori tjetër. Mos e ngjit këtu.", tone: "neutral" },
  invalid_code: { title: "Kodi QR nuk u njoh", body: "Përdor një kod QR bilete të Discover Albania Transport ose shkruaj një referencë të vlefshme rezervimi.", tone: "danger" },
  not_found: { title: "Bileta nuk u gjet", body: "Ky kod nuk përputhet me asnjë biletë.", tone: "danger" },
};

export function TicketScanner({
  expectedRouteId,
  expectedRouteLabel,
}: {
  expectedRouteId?: number;
  expectedRouteLabel?: string;
} = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const scanLockedRef = useRef(false);
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [result, setResult] = useState<TicketValidationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const stopCamera = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    BrowserCodeReader.releaseAllStreams();
    setCameraState("idle");
  }, []);

  const validate = useCallback((value: string) => {
    if (!value.trim() || scanLockedRef.current) return;
    scanLockedRef.current = true;
    stopCamera();
    setResult(null);
    startTransition(async () => {
      try {
        const nextResult = await validateTicketAction(value, expectedRouteId);
        setResult(nextResult);
        if (navigator.vibrate) navigator.vibrate(nextResult.status === "valid" ? 90 : [70, 60, 70]);
      } catch {
        scanLockedRef.current = false;
        setCameraError("Vlefshmërimi nuk arriti të lidhet me serverin. Kontrollo lidhjen dhe provo përsëri.");
      }
    });
  }, [stopCamera, expectedRouteId]);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return;
    stopCamera();
    scanLockedRef.current = false;
    setResult(null);
    setCameraError("");
    setCameraState("starting");

    try {
      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 180 });
      // iOS Safari doesn't always reject getUserMedia when camera access is
      // blocked at the OS level (Settings > Safari > Camera, or a stale
      // per-site "Don't Allow") -- the promise can hang forever instead,
      // leaving the button stuck on "Starting camera..." with no visible
      // error. Race it against a timeout so the user always gets feedback.
      controlsRef.current = await Promise.race([
        reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } }, audio: false },
          videoRef.current,
          (scanResult) => {
            if (scanResult) validate(scanResult.getText());
          }
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("camera-timeout")), 10000)),
      ]);
      setCameraState("active");
    } catch (err) {
      stopCamera();
      setCameraState("error");
      setCameraError(
        err instanceof Error && err.message === "camera-timeout"
          ? "Kamera nuk u përgjigj. Në iPhone, kontrollo që Settings → Safari → Camera të jetë vendosur në Allow (ose Ask), pastaj provo përsëri."
          : "Qasja në kamerë dështoi. Lejo qasjen te kamera, ose bëj/ngarko një foto në vend të kësaj."
      );
    }
  }, [stopCamera, validate]);

  useEffect(() => () => {
    controlsRef.current?.stop();
    BrowserCodeReader.releaseAllStreams();
  }, []);

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    stopCamera();
    scanLockedRef.current = false;
    setResult(null);
    setCameraError("");
    const objectUrl = URL.createObjectURL(file);
    try {
      const decoded = await new BrowserQRCodeReader().decodeFromImageUrl(objectUrl);
      validate(decoded.getText());
    } catch {
      setCameraState("error");
      setCameraError("Nuk u gjet asnjë kod QR i lexueshëm në atë foto. Provo përsëri me kodin e plotë në fokus.");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function resetScanner() {
    scanLockedRef.current = false;
    setResult(null);
    setCameraError("");
    setManualCode("");
  }

  const detail = result && "bookingReference" in result ? result : null;
  const copy = result ? STATUS_COPY[result.status] : null;
  const ResultIcon = copy?.tone === "success" ? CheckCircleIcon : AlertCircleIcon;
  // Once a scan resolves (or is resolving), the camera panel gives way to
  // the result -- a vendor checking someone in doesn't need a dead camera
  // box taking up half the screen next to the answer they're looking for.
  const showCamera = !isPending && !result;

  return (
    <div className={`grid gap-6 ${showCamera ? "lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,.75fr)]" : ""}`}>
      {showCamera && (
      <section className="overflow-hidden rounded-2xl bg-brand-deep text-white shadow-[var(--shadow-lg)]">
        {expectedRouteLabel && (
          <div className="border-b border-white/10 bg-white/5 px-4 py-2 text-center text-xs font-semibold uppercase tracking-wide text-cyan">
            Duke skanuar për {expectedRouteLabel}
          </div>
        )}
        <div className="relative aspect-[4/3] min-h-72 bg-black">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          {cameraState !== "active" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-brand-deep px-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-cyan">
                <QrCodeIcon width={34} height={34} />
              </span>
              <p className="max-w-sm text-sm text-white/75">
                Vendos kodin e plotë QR brenda pamjes së kamerës. Vlefshmërimi ndodh automatikisht.
              </p>
            </div>
          )}
          {cameraState === "active" && (
            <div aria-hidden="true" className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-cyan shadow-[0_0_0_999px_rgba(4,18,29,0.42)]" />
          )}
        </div>
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <Button type="button" onClick={startCamera} disabled={cameraState === "starting" || isPending} className="min-h-12 flex-1">
            <CameraIcon width={18} height={18} />
            {cameraState === "starting" ? "Duke nisur kamerën…" : cameraState === "active" ? "Rinis kamerën" : "Përdor kamerën"}
          </Button>
          <label className="inline-flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            <QrCodeIcon width={18} height={18} />
            Bëj ose ngarko një foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => {
                const input = event.currentTarget;
                void handlePhoto(input.files?.[0]).finally(() => { input.value = ""; });
              }}
            />
          </label>
        </div>
      </section>
      )}

      <aside className={showCamera ? "min-w-0" : "mx-auto w-full max-w-xl min-w-0"}>
        {isPending && (
          <div role="status" className="rounded-2xl border border-border bg-surface p-6 text-center shadow-[var(--shadow-xs)]">
            <div className="mx-auto h-9 w-9 animate-spin rounded-full border-2 border-teal/25 border-t-teal" />
            <p className="mt-3 text-sm font-medium text-foreground">Duke vlefshmëruar biletën…</p>
          </div>
        )}

        {!isPending && result && copy && ResultIcon && (
          <div role={copy.tone === "danger" ? "alert" : "status"} aria-live={copy.tone === "danger" ? "assertive" : "polite"} className={`rounded-2xl border p-6 shadow-[var(--shadow-md)] ${
            copy.tone === "success"
              ? "border-success/30 bg-success-soft text-success"
              : copy.tone === "warning"
                ? "border-warning/30 bg-warning-soft text-warning"
                : copy.tone === "neutral"
                  ? "border-border bg-surface-sunken text-muted"
                  : "border-red/30 bg-red-soft text-red"
          }`}>
            <ResultIcon width={38} height={38} />
            <h2 className="mt-4 font-display text-2xl font-bold text-current">{copy.title}</h2>
            <p className="mt-1 text-sm text-current/85">{copy.body}</p>

            {result.status === "wrong_operator" && (
              <dl className="mt-5 grid gap-3 border-t border-current/20 pt-5 text-sm">
                <div>
                  <dt className="text-current/70">Linja e vërtetë</dt>
                  <dd className="font-semibold">{result.operatorName} · {result.routeCode}</dd>
                </div>
              </dl>
            )}

            {detail && (
              <dl className="mt-5 grid gap-3 border-t border-current/20 pt-5 text-sm">
                <div>
                  <dt className="text-current/70">Udhëtari</dt>
                  <dd className="font-semibold">{detail.passengerName} · {detail.seats} vend{detail.seats === 1 ? "" : "e"}</dd>
                </div>
                <div>
                  <dt className="text-current/70">Linja</dt>
                  <dd className="font-semibold">{detail.routeCode} · {detail.fromStationName} → {detail.toStationName}</dd>
                </div>
                <div>
                  <dt className="text-current/70">Hipja</dt>
                  <dd className="font-semibold">{detail.boardingStationName} · {formatAlbaniaDateTime(new Date(detail.scheduledBoardingAt), "al")}</dd>
                </div>
                <div>
                  <dt className="text-current/70">Referenca</dt>
                  <dd className="font-mono font-semibold">{detail.bookingReference}</dd>
                </div>
                {detail.checkedInAt && (
                  <div>
                    <dt className="text-current/70">Vlefshmëruar</dt>
                    <dd className="font-semibold">{formatAlbaniaDateTime(new Date(detail.checkedInAt), "al")}</dd>
                  </div>
                )}
              </dl>
            )}

            <Button type="button" variant="outline" onClick={resetScanner} className="mt-6 w-full border-current/30 bg-white/70 text-current hover:bg-white">
              Skano një biletë tjetër
            </Button>
          </div>
        )}

        {!isPending && !result && (
          <form
            className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow-xs)]"
            onSubmit={(event) => {
              event.preventDefault();
              validate(manualCode);
            }}
          >
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-semibold text-foreground">Shkruaj referencën e rezervimit</span>
              <input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value.toUpperCase())}
                placeholder="DA-XXXXXXXX"
                autoCapitalize="characters"
                className="min-h-14 rounded-xl border border-border bg-background px-4 py-3 font-mono text-base uppercase outline-none focus:border-teal focus:ring-2 focus:ring-teal/15"
              />
            </label>
            <Button type="submit" disabled={!manualCode.trim()} className="mt-3 min-h-12 w-full">Vlefshmëro referencën</Button>
          </form>
        )}

        {cameraError && (
          <p role="alert" className="mt-4 rounded-xl border border-red/30 bg-red-soft p-4 text-sm text-red">{cameraError}</p>
        )}
      </aside>
    </div>
  );
}
