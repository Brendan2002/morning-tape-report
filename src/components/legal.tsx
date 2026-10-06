export const FRED_TERMS_URL = "https://fred.stlouisfed.org/docs/api/terms_of_use.html";

export function FredNotice() {
  return (
    <a href={FRED_TERMS_URL} target="_blank" rel="noopener noreferrer">
      This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.
    </a>
  );
}
