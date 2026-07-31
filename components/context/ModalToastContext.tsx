'use client';

import React, { createContext, useContext, useState } from 'react';
import type { HousekeepingStatus } from '@/types';

interface ModalToastContextValue {
  isReservationOpen: boolean;
  openReservation: () => void;
  closeReservation: () => void;
  isRoomOpen: boolean;
  openRoom: (roomId: string, status: HousekeepingStatus, reason?: string) => void;
  closeRoom: () => void;
  selectedRoomId: string | null;
  selectedRoomStatus: HousekeepingStatus | null;
  selectedRoomReason: string;
  setSelectedRoomStatus: (status: HousekeepingStatus) => void;
  setSelectedRoomReason: (reason: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;
  isClosureConfirmOpen: boolean;
  openClosureConfirm: () => void;
  closeClosureConfirm: () => void;
  closureDetailDate: string | null;
  openClosureDetail: (date: string) => void;
  closeClosureDetail: () => void;
}

const ModalToastContext = createContext<ModalToastContextValue | undefined>(undefined);

export function ModalToastProvider({ children }: { children: React.ReactNode }) {
  const [isReservationOpen, setReservationOpen] = useState(false);
  const [isRoomOpen, setRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomStatus, setSelectedRoomStatus] = useState<HousekeepingStatus | null>(null);
  const [selectedRoomReason, setSelectedRoomReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClosureConfirmOpen, setClosureConfirmOpen] = useState(false);
  const [closureDetailDate, setClosureDetailDate] = useState<string | null>(null);

  const openReservation = () => setReservationOpen(true);
  const closeReservation = () => setReservationOpen(false);
  const openRoom = (roomId: string, status: HousekeepingStatus, reason: string = '') => {
    setSelectedRoomId(roomId);
    setSelectedRoomStatus(status);
    setSelectedRoomReason(reason || '');
    setRoomOpen(true);
  };
  const closeRoom = () => {
    setRoomOpen(false);
    setSelectedRoomId(null);
    setSelectedRoomStatus(null);
    setSelectedRoomReason('');
  };
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const hideToast = () => setToastMessage(null);
  const openClosureConfirm = () => setClosureConfirmOpen(true);
  const closeClosureConfirm = () => setClosureConfirmOpen(false);
  const openClosureDetail = (date: string) => setClosureDetailDate(date);
  const closeClosureDetail = () => setClosureDetailDate(null);

  const value: ModalToastContextValue = {
    isReservationOpen,
    openReservation,
    closeReservation,
    isRoomOpen,
    openRoom,
    closeRoom,
    selectedRoomId,
    selectedRoomStatus,
    selectedRoomReason,
    setSelectedRoomStatus,
    setSelectedRoomReason,
    toastMessage,
    showToast,
    hideToast,
    isClosureConfirmOpen,
    openClosureConfirm,
    closeClosureConfirm,
    closureDetailDate,
    openClosureDetail,
    closeClosureDetail,
  };

  return (
    <ModalToastContext.Provider value={value}>
      {children}
    </ModalToastContext.Provider>
  );
}

export function useModalToast() {
  const ctx = useContext(ModalToastContext);
  if (!ctx) throw new Error('useModalToast must be used within a ModalToastProvider');
  return ctx;
}
