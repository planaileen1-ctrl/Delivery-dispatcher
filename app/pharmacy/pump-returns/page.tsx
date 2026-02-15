"use client";

import PumpReturnsPage from "@/app/employee/pump-returns/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyPumpReturnsPage() {
	return (
		<PharmacyAdminFrame title="Pump Returns" subtitle="Verify and close returns">
			<PumpReturnsPage />
		</PharmacyAdminFrame>
	);
}
