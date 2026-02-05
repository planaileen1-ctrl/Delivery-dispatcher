"use client";

import { useEffect, useState } from "react";
import { onSnapshot, QuerySnapshot, DocumentData } from "firebase/firestore";
import { getCollectionRef } from "@/lib/firestore";
import { Order, Pump, Client, Employee } from "@/types";

export function useFirestoreSubs(enabled: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [pumps, setPumps] = useState<Pump[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [drivers, setDrivers] = useState<Employee[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const sub = <T,>(
      col: string,
      setter: (data: T[]) => void
    ) =>
      onSnapshot(
        getCollectionRef(col),
        (s: QuerySnapshot<DocumentData>) =>
          setter(s.docs.map((d) => ({ id: d.id, ...d.data() } as T))),
        (err) => console.error(`Firestore error [${col}]`, err)
      );

    const u1 = sub<Order>("deliveries", setOrders);
    const u2 = sub<Pump>("pumps", setPumps);
    const u3 = sub<Client>("clients", setClients);
    const u4 = sub<Employee>("pharmacyEmployees", setEmployees);
    const u5 = sub<Employee>("deliveryDrivers", setDrivers);

    return () => {
      u1(); u2(); u3(); u4(); u5();
    };
  }, [enabled]);

  return { orders, pumps, clients, employees, drivers };
}
