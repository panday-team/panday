const useLocalStorage = (key: string, defaultValue: string | null = null) => {
  const getItem = () => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Error accessing localStorage key "${key}":`, error);
      return defaultValue;
    }
  };

  const setItem = (value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return { getItem, setItem };
};

export default useLocalStorage;
