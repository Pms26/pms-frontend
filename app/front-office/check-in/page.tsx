'use client';

import FrontOfficeTabs from '@/components/front-office/FrontOfficeTabs';
import RoomList from '@/components/front-office/RoomList';
import CheckInBooking from '@/components/front-office/CheckInBooking';

export default function FrontOfficeCheckInPage() {
  return (
    <section className="pms-section">
      <div className="section-header">
        <h2 className="section-title">Front Office</h2>
      </div>

      <FrontOfficeTabs />

      <div className="fo-panel">
        <div className="row g-3">
          <div className="col-lg-5">
            <RoomList />
          </div>

          <div className="col-lg-7">
            <CheckInBooking />
          </div>
        </div>
      </div>
    </section>
  );
}
