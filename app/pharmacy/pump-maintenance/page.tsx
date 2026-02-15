"use client";

import PumpMaintenancePage from "@/app/employee/pump-maintenance/page";
import PharmacyAdminFrame from "@/components/PharmacyAdminFrame";

export default function PharmacyPumpMaintenancePage() {
	return (
		<PharmacyAdminFrame title="Pump Maintenance" subtitle="Technical follow-up">
			<PumpMaintenancePage />
		</PharmacyAdminFrame>
	);
}
