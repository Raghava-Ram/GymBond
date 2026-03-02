// lib/streak.ts

import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { getTodayDateString, getYesterdayDateString } from "./dateUtils";
import { db } from "./firebase";

export const updateIndividualStreak = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const today = getTodayDateString();
  const yesterday = getYesterdayDateString();

  await runTransaction(db, async (transaction) => {
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const lastWorkoutDate = data.lastWorkoutDate || null;
    let currentStreak = data.currentStreak || 0;
    let longestStreak = data.longestStreak || 0;

    // Prevent double count
    if (lastWorkoutDate === today) return;

    if (lastWorkoutDate === yesterday) {
      currentStreak += 1;
    } else {
      currentStreak = 1;
    }

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    transaction.update(userRef, {
      currentStreak,
      longestStreak,
      lastWorkoutDate: today,
      updatedAt: serverTimestamp(),
    });

    // Also create workout log
    const workoutRef = doc(db, "workoutLogs", userId, "days", today);
    transaction.set(workoutRef, {
      completed: true,
      completedAt: serverTimestamp(),
    });
  });
};

export const completeWorkout = async (userId: string, musclesCompleted: string[]) => {
  const userRef = doc(db, "users", userId);
  const today = getTodayDateString();

  await runTransaction(db, async (transaction) => {
    // STEP 1 — READ PHASE (NO WRITES)
    const userSnap = await transaction.get(userRef);

    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const lastWorkoutDate = data.lastWorkoutDate || null;
    const currentStreak = data.currentStreak || 0;
    const longestStreak = data.longestStreak || 0;
    const activeDuoId = data.activeDuoId;

    // Prevent double completion
    if (lastWorkoutDate === today) return;

    let partnerData: any = null;
    let duoData: any = null;

    // Read duo data if active duo exists
    if (activeDuoId) {
      const duoRef = doc(db, "duos", activeDuoId);
      const duoSnap = await transaction.get(duoRef);
      
      if (duoSnap.exists()) {
        duoData = duoSnap.data();
        const members = duoData.members || [];
        const partnerId = members.find((uid: string) => uid !== userId);
        
        if (partnerId) {
          const partnerWorkoutRef = doc(db, "workoutLogs", partnerId, "days", today);
          const partnerWorkoutSnap = await transaction.get(partnerWorkoutRef);
          
          if (partnerWorkoutSnap.exists()) {
            partnerData = partnerWorkoutSnap.data();
          }
        }
      }
    }

    // STEP 2 — COMPUTE PHASE
    let newCurrentStreak: number;
    let newLongestStreak: number;

    if (lastWorkoutDate === getYesterdayDateString()) {
      newCurrentStreak = currentStreak + 1;
    } else {
      newCurrentStreak = 1;
    }

    if (newCurrentStreak > longestStreak) {
      newLongestStreak = newCurrentStreak;
    } else {
      newLongestStreak = longestStreak;
    }

    let newDuoStreak: number | null = null;

    if (duoData && partnerData?.completed) {
      const yesterday = getYesterdayDateString();
      const lastDuoWorkoutDate = duoData.lastDuoWorkoutDate || "";
      
      if (lastDuoWorkoutDate === today) {
        // already counted → do nothing
        newDuoStreak = null;
      } else if (lastDuoWorkoutDate === yesterday) {
        // continue streak
        newDuoStreak = (duoData.duoStreak || 0) + 1;
      } else {
        // start new streak
        newDuoStreak = 1;
      }
    }

    // STEP 3 — WRITE PHASE
    // Update user streak
    transaction.update(userRef, {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastWorkoutDate: today,
      updatedAt: serverTimestamp(),
    });

    // Create workout log with muscles completed
    const workoutRef = doc(db, "workoutLogs", userId, "days", today);
    transaction.set(workoutRef, {
      completed: true,
      musclesCompleted,
      completedAt: serverTimestamp(),
    });

    // Update duo streak if needed
    if (newDuoStreak !== null && duoData) {
      const duoRef = doc(db, "duos", activeDuoId);
      transaction.update(duoRef, {
        duoStreak: newDuoStreak,
        lastDuoWorkoutDate: today,
      });
    }
  });
};
