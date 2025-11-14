import { logger } from "@/lib/logger";

const useLocalStorage = (key: string, defaultValue: string | null = null) => {
  const getItem = () => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      logger.error(`Error accessing localStorage key`, error instanceof Error ? error : new Error(String(error)), { key });
      return defaultValue;
    }
  };

  const setItem = (value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      logger.error(`Error setting localStorage key`, error instanceof Error ? error : new Error(String(error)), { key });
    }
  };

  return { getItem, setItem };
};

export default useLocalStorage;
