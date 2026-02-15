"use client";

import DriverTrackingPage from "@/app/employee/driver-tracking/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyDriverTrackingPage() {
	return (
		<PharmacyAdminFrame title="Driver Tracking" subtitle="Live map monitoring">
			<DriverTrackingPage />
		</PharmacyAdminFrame>
	);
}
