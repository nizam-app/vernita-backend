import { Notification } from "../modules/notification/notification.model.js";
import { Webinar } from "../modules/webinar/webinar.model.js";
import { WebinarRegistration } from "../modules/webinar/webinar-registration.model.js";
import { User } from "../modules/user/user.model.js";

const MS = 1000;
const MIN = 60 * MS;

const roundToMinute = (d) => new Date(Math.floor(d.getTime() / MIN) * MIN);

const safeInsertMany = async (docs) => {
  if (!docs.length) return;
  try {
    await Notification.insertMany(docs, { ordered: false });
  } catch {
    // ignore duplicate dedupeKey collisions
  }
};

const queueWebinarReminders = async (now) => {
  const start = new Date(now.getTime());
  const end = new Date(now.getTime() + 25 * 60 * MIN); // look ahead ~25 hours

  const webinars = await Webinar.find({
    isDeleted: false,
    isPublished: true,
    status: { $in: ["upcoming", "live"] },
    scheduledAt: { $gte: start, $lte: end },
  }).select("_id title scheduledAt");

  if (!webinars.length) return;

  const webinarIds = webinars.map((w) => w._id);
  const regs = await WebinarRegistration.find({
    webinarId: { $in: webinarIds },
    registrationStatus: { $in: ["registered", "pending_payment"] },
  }).select("webinarId userId");

  if (!regs.length) return;

  const byWebinar = new Map();
  for (const w of webinars) byWebinar.set(String(w._id), w);

  const docs = [];
  for (const r of regs) {
    const w = byWebinar.get(String(r.webinarId));
    if (!w?.scheduledAt) continue;

    const minutesTo = Math.round((w.scheduledAt.getTime() - now.getTime()) / MIN);
    const slots = [
      { kind: "24h", targetMin: 24 * 60, window: 2 },
      { kind: "1h", targetMin: 60, window: 2 },
    ];

    for (const s of slots) {
      if (Math.abs(minutesTo - s.targetMin) > s.window) continue;
      const scheduledFor = roundToMinute(now);
      const dedupeKey = `webinar_reminder:${w._id}:${r.userId}:${s.kind}`;
      docs.push({
        userId: r.userId,
        type: "webinar_reminder",
        channel: "in_app",
        title: `Webinar reminder: ${w.title}`,
        body:
          s.kind === "24h"
            ? "Your webinar starts in about 24 hours."
            : "Your webinar starts in about 1 hour.",
        data: { webinarId: w._id, scheduledAt: w.scheduledAt, kind: s.kind },
        scheduledFor,
        status: "pending",
        dedupeKey,
      });
    }
  }

  await safeInsertMany(docs);
};

const queueSubscriptionRenewalReminders = async (now) => {
  const start = new Date(now.getTime() - 5 * MIN);
  const end = new Date(now.getTime() + 8 * 24 * 60 * MIN); // 8 days

  const users = await User.find({
    isActive: true,
    isBlocked: false,
    "subscription.isActive": true,
    "subscription.endsAt": { $ne: null, $gte: start, $lte: end },
  }).select("_id subscription endsAt name email");

  if (!users.length) return;

  const docs = [];
  for (const u of users) {
    const endsAt = u.subscription?.endsAt ? new Date(u.subscription.endsAt) : null;
    if (!endsAt) continue;
    const minutesTo = Math.round((endsAt.getTime() - now.getTime()) / MIN);
    const slots = [
      { kind: "7d", targetMin: 7 * 24 * 60, window: 10 },
      { kind: "1d", targetMin: 24 * 60, window: 10 },
    ];

    for (const s of slots) {
      if (Math.abs(minutesTo - s.targetMin) > s.window) continue;
      const scheduledFor = roundToMinute(now);
      const dedupeKey = `subscription_renewal:${u._id}:${endsAt.toISOString()}:${s.kind}`;
      docs.push({
        userId: u._id,
        type: "subscription_renewal_reminder",
        channel: "in_app",
        title: "Subscription renewal reminder",
        body:
          s.kind === "7d"
            ? "Your subscription is set to renew in about 7 days."
            : "Your subscription is set to renew in about 1 day.",
        data: { endsAt, kind: s.kind },
        scheduledFor,
        status: "pending",
        dedupeKey,
      });
    }
  }

  await safeInsertMany(docs);
};

const deliverDueInApp = async (now) => {
  const due = await Notification.find({
    status: "pending",
    channel: "in_app",
    scheduledFor: { $lte: now },
  })
    .sort({ scheduledFor: 1 })
    .limit(500);

  if (!due.length) return 0;

  const ids = due.map((d) => d._id);
  await Notification.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "sent", sentAt: now } }
  );

  return due.length;
};

export const startNotificationScheduler = ({ intervalMs = 30 * MS } = {}) => {
  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    const now = new Date();
    try {
      await queueWebinarReminders(now);
      await queueSubscriptionRenewalReminders(now);
      await deliverDueInApp(now);
    } finally {
      running = false;
    }
  };

  timer = setInterval(tick, intervalMs);
  timer.unref?.();
  // run once shortly after boot
  setTimeout(tick, 1000).unref?.();

  return () => {
    if (timer) clearInterval(timer);
  };
};

