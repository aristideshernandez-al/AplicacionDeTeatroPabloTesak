"use client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { User } from "firebase/auth";
import { firebase } from "./firebase";
import {
  androidDate,
  blankActivity,
  formatCode,
  isApproved,
  participantTotal,
  type Activity,
  type Institution,
  type Profile,
  type Status,
} from "./models";

export async function syncProfile(user: User) {
  const { db } = firebase();
  const reference = doc(db, "users", user.uid);
  const snapshot = await getDoc(reference);
  if (!snapshot.exists())
    await setDoc(reference, {
      uid: user.uid,
      fullName: user.displayName || user.email?.split("@")[0] || "Usuario",
      email: user.email || "",
      role: "USER",
      active: true,
      emailVerified: user.emailVerified,
      createdBy: "SYSTEM",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      profilePhotoUrl: user.photoURL || null,
      accountDeletionRequested: false,
    });
  else
    await updateDoc(reference, {
      lastLoginAt: serverTimestamp(),
      emailVerified: user.emailVerified,
    });
}
export function subscribe<T>(
  name: string,
  receive: (data: T[]) => void,
  fail: (e: Error) => void,
  filter?: [string, string],
) {
  const { db } = firebase();
  const base = collection(db, name);
  const source = filter ? query(base, where(filter[0], "==", filter[1])) : base;
  return onSnapshot(
    source,
    (snap) => receive(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T)),
    fail,
  );
}
export function normalizeActivity(data: DocumentData): Activity {
  const base = blankActivity({
    uid: "",
    fullName: "",
    email: "",
    active: true,
    emailVerified: false,
    role: "USER",
  });
  return {
    ...base,
    ...data,
    participants: { ...base.participants, ...data.participants },
    technicalInfo: { ...base.technicalInfo, ...data.technicalInfo },
  } as Activity;
}
export function normalizeInstitution(data: DocumentData): Institution {
  return {
    name: String(data.name ?? data.nombre ?? data.nombreInstitucion ?? ""),
    type: String(data.type ?? data.tipo ?? data.tipoInstitucion ?? ""),
    department: String(data.department ?? data.departamento ?? ""),
    municipality: String(data.municipality ?? data.municipio ?? ""),
    district: String(data.district ?? data.distrito ?? ""),
    infrastructureCode: String(
      data.infrastructureCode ?? data.codigoInfraestructura ?? data.codigo ?? "",
    ),
    contactName: String(data.contactName ?? data.nombreContacto ?? data.contacto ?? ""),
    contactPhone: String(data.contactPhone ?? data.telefonoContacto ?? data.telefono ?? ""),
  };
}
export type EvidenceField =
  "photoUrls" | "attendanceListUrls" | "otherAnnexUrls";
export type EvidenceFiles = Record<EvidenceField, File[]>;
export const emptyFiles = (): EvidenceFiles => ({
  photoUrls: [],
  attendanceListUrls: [],
  otherAnnexUrls: [],
});
export async function compressPhoto(file: File): Promise<Blob> {
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("No se pudo comprimir la fotografía.")),
      "image/jpeg",
      0.88,
    ),
  );
}

/** Assign once in a transaction. A repeated submission reuses the server ID/code. */
export async function saveActivity(
  activity: Activity,
  status: Status,
  files: EvidenceFiles,
  checkpoint: (a: Activity, field?: EvidenceField, file?: File) => void,
): Promise<Activity> {
  const { db, storage, auth } = firebase();
  if (!auth.currentUser) throw new Error("Inicia sesión para guardar.");
  if (!navigator.onLine)
    throw Object.assign(new Error("Sin conexión"), { code: "unavailable" });
  const reference = activity.id
    ? doc(db, "activities", activity.id)
    : doc(collection(db, "activities"));
  const prepared = {
    ...activity,
    id: reference.id,
    fecha: androidDate(activity.fecha),
    participants: {
      ...activity.participants,
      totalGeneral: participantTotal(activity.participants),
    },
  };
  // Keep submission as a draft until every attachment is confirmed.
  const stagedStatus: Status =
    status === "APPROVED" && Object.values(files).some((list) => list.length)
      ? activity.id && isApproved(activity.status)
        ? activity.status
        : "DRAFT"
      : status;
  let saved: Activity;
  if (stagedStatus === "APPROVED" && !prepared.code) {
    saved = await assignCode(prepared, reference.id);
  } else {
    const existing = await getDoc(reference);
    saved = { ...prepared, status: stagedStatus };
    await setDoc(
      reference,
      {
        ...saved,
        createdAt: existing.data()?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
  checkpoint(saved);
  for (const field of [
    "photoUrls",
    "attendanceListUrls",
    "otherAnnexUrls",
  ] as EvidenceField[]) {
    for (const file of files[field]) {
      const blob = field === "photoUrls" ? await compressPhoto(file) : file;
      const folder = {
        photoUrls: "photos",
        attendanceListUrls: "attendance",
        otherAnnexUrls: "annexes",
      }[field];
      const extension =
        field === "photoUrls"
          ? "jpg"
          : file.name
              .split(".")
              .pop()
              ?.replace(/[^a-z0-9]/gi, "") || "pdf";
      const destination = ref(
        storage,
        `activities/${saved.responsibleId}/${saved.id}/${folder}/${crypto.randomUUID()}.${extension}`,
      );
      await uploadBytes(destination, blob, {
        contentType: blob.type || "application/octet-stream",
      });
      const url = await getDownloadURL(destination);
      saved = { ...saved, [field]: [...saved[field], url] };
      await updateDoc(reference, {
        [field]: saved[field],
        updatedAt: serverTimestamp(),
      });
      checkpoint(saved, field, file);
    }
  }
  if (status === "APPROVED" && saved.status !== "APPROVED") {
    if (!saved.code) saved = await assignCode(saved, saved.id);
    else {
      saved = { ...saved, status: "APPROVED" };
      await updateDoc(reference, {
        status: "APPROVED",
        updatedAt: serverTimestamp(),
      });
    }
    checkpoint(saved);
  }
  if (status === "APPROVED") {
    // Non-admin clients cannot enumerate users under Android's rules.
    // Notification failure must never undo an already committed activity.
    try {
      const self = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (self.data()?.role === "ADMIN") {
        const admins = await getDocs(
          query(collection(db, "users"), where("role", "==", "ADMIN")),
        );
        const recipients = new Set(
          admins.docs.filter((d) => d.data().active !== false).map((d) => d.id),
        );
        if (saved.responsibleId !== auth.currentUser.uid)
          recipients.add(saved.responsibleId);
        await Promise.all(
          [...recipients].map((uid) =>
            notify(
              uid,
              activity.id ? "Actividad actualizada" : "Actividad registrada",
              `${saved.responsibleName}: ${saved.nombreActividad}`,
              saved.id,
              "ACTIVITY_SUBMITTED",
            ),
          ),
        );
      }
    } catch (e) {
      console.warn("Actividad guardada; no se pudo notificar.", e);
    }
  }
  return saved;
}
async function assignCode(activity: Activity, id: string): Promise<Activity> {
  const { db } = firebase();
  const reference = doc(db, "activities", id);
  const year = Number(
    new Intl.DateTimeFormat("en", {
      year: "numeric",
      timeZone: "America/El_Salvador",
    }).format(new Date()),
  );
  const counter = doc(db, "counters", `activities_${year}`);
  return runTransaction(db, async (transaction) => {
    const current = await transaction.get(reference);
    const existingCode = current.data()?.code as string | undefined;
    const saved = {
      ...activity,
      id,
      status: "APPROVED" as const,
      code: existingCode || activity.code,
    };
    if (!saved.code) {
      const count = await transaction.get(counter);
      const sequence = Number(count.data()?.count || 0) + 1;
      saved.code = formatCode(year, sequence);
      transaction.set(counter, { count: sequence }, { merge: true });
    }
    transaction.set(
      reference,
      {
        ...saved,
        createdAt: current.data()?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    return saved;
  });
}
export async function notify(
  userId: string,
  title: string,
  message: string,
  activityId: string,
  type: string,
) {
  const { db } = firebase();
  const reference = doc(collection(db, "notifications"));
  await setDoc(reference, {
    id: reference.id,
    userId,
    title,
    message,
    activityId,
    type,
    isRead: false,
    createdAt: serverTimestamp(),
  });
}
export async function removeRecord(name: string, id: string) {
  await deleteDoc(doc(firebase().db, name, id));
}
export async function patchRecord(
  name: string,
  id: string,
  data: DocumentData,
) {
  await updateDoc(doc(firebase().db, name, id), data);
}
export async function putRecord(name: string, id: string, data: DocumentData) {
  await setDoc(doc(firebase().db, name, id), data, { merge: true });
}
