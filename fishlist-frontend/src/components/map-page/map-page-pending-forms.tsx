"use client";

import CatchForm from "@/components/catch-form";
import CampForm from "@/components/camp-form";
import type { CatchFormSuccessInfo } from "@/components/catch-form";
import type { CampFormSuccessInfo } from "@/components/camp-form";
import type { PendingCamp, PendingCatch } from "@/components/map-page/map-page-types";

type Props = {
  pendingCatch: PendingCatch | null;
  pendingCamp: PendingCamp | null;
  onCatchClose: () => void;
  onCatchSuccess: (info: CatchFormSuccessInfo) => void | Promise<void>;
  onCampClose: () => void;
  onCampSuccess: (saved: CampFormSuccessInfo) => void | Promise<void>;
};

export function MapPagePendingForms({
  pendingCatch,
  pendingCamp,
  onCatchClose,
  onCatchSuccess,
  onCampClose,
  onCampSuccess,
}: Props) {
  return (
    <>
      {pendingCatch ? (
        <CatchForm
          lat={pendingCatch.lat}
          lng={pendingCatch.lng}
          onClose={onCatchClose}
          onSuccess={(info) => {
            void onCatchSuccess(info);
          }}
        />
      ) : null}
      {pendingCamp ? (
        <CampForm
          lat={pendingCamp.lat}
          lng={pendingCamp.lng}
          onClose={onCampClose}
          onSuccess={(saved) => {
            void onCampSuccess(saved);
          }}
        />
      ) : null}
    </>
  );
}
