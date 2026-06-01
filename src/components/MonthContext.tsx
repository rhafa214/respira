import React, { createContext, useContext, useState } from "react";

interface MonthContextProps {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
}

const MonthContext = createContext<MonthContextProps | undefined>(undefined);

export function MonthProvider({ children }: { children: React.ReactNode }) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  return (
    <MonthContext.Provider value={{ currentDate, setCurrentDate }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (context === undefined) {
    throw new Error("useMonth must be used within a MonthProvider");
  }
  return context;
}
