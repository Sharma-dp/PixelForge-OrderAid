
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppContext } from "./app-context.js";
import { api } from "../services/api.js";

const DEMO_USER_KEY = "orderaid-demo-user";
const DEMO_CASES_KEY = "orderaid-demo-cases";

const seedCases = [
  {
    case_id: "OA-1024",
    retailer: "Amazon",
    item: "Wireless headphones",
    order_id: "ORD-882104",
    issue: "Item arrived damaged",
    amount: "₹3,000",
    status: "Awaiting Approval",
    updated_at: "Today, 10:42 AM",
    demo: true,
  },
  {
    case_id: "OA-1023",
    retailer: "Flipkart",
    item: "Running shoes",
    order_id: "OD-449210",
    issue: "Wrong item received",
    amount: "₹2,499",
    status: "Investigating",
    updated_at: "Today, 9:15 AM",
    demo: true,
  },
  {
    case_id: "OA-1022",
    retailer: "Myntra",
    item: "Phone charger",
    order_id: "MY-201193",
    issue: "Refund taking too long",
    amount: "₹899",
    status: "Resolved",
    updated_at: "Yesterday",
    demo: true,
  },
];

function readCases() {
  try {
    const stored = localStorage.getItem(DEMO_CASES_KEY);
    return stored ? JSON.parse(stored) : seedCases;
  } catch {
    return seedCases;
  }
}

function readDemoUser() {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USER_KEY) || "null");
  } catch {
    return null;
  }
}

function saveCasesToStorage(items) {
  try {
    localStorage.setItem(DEMO_CASES_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Could not save cases locally:", error);
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(readDemoUser);
  const [cases, setCases] = useState(readCases);
  const [casesLoading, setCasesLoading] = useState(true);
  const [casesError, setCasesError] = useState("");

  const refreshCases = useCallback(async () => {
    setCasesLoading(true);
    setCasesError("");

    try {
      const serverCases = await api.getCases();

      if (!Array.isArray(serverCases)) {
        throw new Error("The backend returned an unexpected case list.");
      }

      // Show backend cases first, while preserving local demo cases.
      const demoCases = readCases().filter((item) => item.demo);
      const combinedCases = [
        ...serverCases,
        ...demoCases.filter(
          (demoCase) =>
            !serverCases.some(
              (serverCase) => serverCase.case_id === demoCase.case_id
            )
        ),
      ];

      setCases(combinedCases);
      saveCasesToStorage(combinedCases);
    } catch (error) {
      console.error("Could not load cases from backend:", error);
      setCasesError(
        "Couldn't refresh cases from the backend. Showing saved cases instead."
      );
    } finally {
      setCasesLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCases();
  }, [refreshCases]);

  const value = useMemo(
    () => ({
      user,
      cases,
      casesLoading,
      casesError,
      refreshCases,

      signInDemo(profile) {
        setUser(profile);
        localStorage.setItem(DEMO_USER_KEY, JSON.stringify(profile));
      },

      signOut() {
        setUser(null);
        localStorage.removeItem(DEMO_USER_KEY);
      },

      addCase(item) {
        setCases((previous) => {
          const next = [
            item,
            ...previous.filter(
              (existing) => existing.case_id !== item.case_id
            ),
          ];

          saveCasesToStorage(next);
          return next;
        });
      },

      updateCase(updated) {
        setCases((previous) => {
          const next = previous.map((item) =>
            item.case_id === updated.case_id
              ? { ...item, ...updated }
              : item
          );

          saveCasesToStorage(next);
          return next;
        });
      },
    }),
    [user, cases, casesLoading, casesError, refreshCases]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
