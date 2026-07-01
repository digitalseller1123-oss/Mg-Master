const LOGO = "https://customer-assets.emergentagent.com/job_certifica-alturas/artifacts/lj7w6c1o_logo.png";

export default function Logo({ size = 40, withText = true, textColor = "text-white", className = "" }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={LOGO} alt="MG Master Group" style={{ width: size, height: size }}
           className="rounded-full bg-black object-cover" data-testid="brand-logo" />
      {withText && (
        <div className="flex flex-col leading-none">
          <span className={`font-display text-base sm:text-lg font-bold tracking-tight ${textColor}`}>
            MG MASTER GROUP
          </span>
          <span className="text-overline text-[#737373] mt-0.5">
            Trabajo seguro en alturas
          </span>
        </div>
      )}
    </div>
  );
}
