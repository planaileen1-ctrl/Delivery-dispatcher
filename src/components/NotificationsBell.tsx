"use client";

import { useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

/* =======================
   Types
======================= */
type Notification = {
  id: string;
  title: string;
  message: string;
  deliveryId?: string;
  read: boolean;
  createdAt?: any;
};

export default function NotificationsBell({
  userId,
  role,
}: {
  userId: string;
  role: "client" | "driver" | "pharmacy";
}) {
  const [notifications, setNotifications] =
    useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const router = useRouter();

  /* 🔊 Audio refs */
  const normalSound = useRef<HTMLAudioElement | null>(
    null
  );
  const returnSound = useRef<HTMLAudioElement | null>(
    null
  );

  /* 🧠 Previous count to detect new */
  const prevCount = useRef(0);

  /* =======================
     LOAD SOUNDS (SSR SAFE)
  ======================= */
  useEffect(() => {
    if (typeof window === "undefined") return;

    normalSound.current = new Audio(
      "/sounds/notification.mp3"
    );
    returnSound.current = new Audio(
      "/sounds/return.mp3"
    );
  }, []);

  /* =======================
     REALTIME LISTENER
  ======================= */
  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      where("role", "==", role),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // 🔔 PLAY SOUND IF NEW NOTIFICATION
      if (list.length > prevCount.current) {
        const newest = list[0];

        if (
          newest?.message
            ?.toLowerCase()
            .includes("return")
        ) {
          returnSound.current?.play();
        } else {
          normalSound.current?.play();
        }
      }

      prevCount.current = list.length;
      setNotifications(list);
    });

    return () => unsub();
  }, [userId, role]);

  /* 🔴 UNREAD COUNT */
  const unreadCount = notifications.filter(
    (n) => !n.read
  ).length;

  /* =======================
     OPEN NOTIFICATION
  ======================= */
  const openNotification = async (
    n: Notification
  ) => {
    if (!n.read) {
      await updateDoc(
        doc(db, "notifications", n.id),
        { read: true }
      );
    }

    setOpen(false);

    if (n.deliveryId) {
      if (role === "pharmacy") {
        router.push("/pharmacy/returns");
      }
      if (role === "driver") {
        router.push("/delivery-driver/dashboard");
      }
      if (role === "client") {
        router.push("/client/dashboard");
      }
    }
  };

  /* =======================
     UI
  ======================= */
  return (
    <div className="relative">
      {/* 🔔 ICON */}
      <button
        onClick={() => setOpen(!open)}
        className="relative"
        aria-label="Notifications"
      >
        <Bell size={22} />

        {/* 🔴 BADGE */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* 📩 DROPDOWN */}
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-3 font-semibold border-b">
            Notifications
          </div>

          {notifications.length === 0 && (
            <p className="p-4 text-gray-500 text-sm">
              No notifications
            </p>
          )}

          <ul className="max-h-80 overflow-y-auto">
            {notifications.map((n) => (
              <li
                key={n.id}
                onClick={() =>
                  openNotification(n)
                }
                className={`p-3 cursor-pointer border-b hover:bg-gray-50 ${
                  !n.read
                    ? "bg-blue-50"
                    : ""
                }`}
              >
                <p className="font-medium text-sm">
                  {n.title}
                </p>
                <p className="text-xs text-gray-600">
                  {n.message}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
