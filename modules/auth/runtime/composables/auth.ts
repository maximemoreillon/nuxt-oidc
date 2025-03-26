export function useAuth() {
  const oidcConfig = useState();
  const oidcAuthData = useState();

  return {
    oidcAuthData,
    oidcConfig,
  };
}
