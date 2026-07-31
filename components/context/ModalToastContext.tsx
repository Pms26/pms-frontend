'use client';
import React, { createContext, useContext, useState } from 'react';
import type { RoomStatus } from '@/types';

interface ModalToastContextValue {
  isReservationOpen: boolean;
  reservationEditId: string | null;
  openReservation: (id?: string) => void;
  closeReservation: () => void;
  isRoomOpen: boolean;
  openRoom: (roomId: string, status: RoomStatus, reason?: string) => void;
  closeRoom: () => void;
  selectedRoomId: string | null;
  selectedRoomStatus: RoomStatus | null;
  selectedRoomReason: string;
  setSelectedRoomStatus: (status: RoomStatus) => void;
  setSelectedRoomReason: (reason: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  hideToast: () => void;
}

const ModalToastContext = createContext<ModalToastContextValue | undefined>(undefined);

export function ModalToastProvider({ children }: { children: React.ReactNode }) {
  const [isReservationOpen, setReservationOpen] = useState(false);
  const [reservationEditId, setReservationEditId] = useState<string | null>(null);
  const [isRoomOpen, setRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [selectedRoomStatus, setSelectedRoomStatus] = useState<RoomStatus | null>(null);
  const [selectedRoomReason, setSelectedRoomReason] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  
  const openReservation = (id?: string) => {
    setReservationEditId(id || null);
    setReservationOpen(true);
  };
  const closeReservation = () => {
    setReservationOpen(false);
    setReservationEditId(null);
  };

  const openRoom = (roomId: string, status: RoomStatus, reason: string = '') => {
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

  const value: ModalToastContextValue = {
    isReservationOpen,
    reservationEditId,
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