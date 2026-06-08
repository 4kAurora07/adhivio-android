import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-background/95 group-[.toaster]:!backdrop-blur-2xl group-[.toaster]:!text-foreground group-[.toaster]:!border-border/60 group-[.toaster]:!shadow-2xl group-[.toaster]:!rounded-2xl group-[.toaster]:!font-bold group-[.toaster]:!text-xs group-[.toaster]:!py-3.5 group-[.toaster]:!px-4 group-[.toaster]:!gap-3 border transition-all duration-300",
          title: "text-[13px] !font-extrabold text-foreground tracking-tight",
          description: "text-xs text-muted-foreground",
          icon: "group-[.toast]:!w-5 group-[.toast]:!h-5 group-[.toast]:!flex group-[.toast]:!items-center group-[.toast]:!justify-center group-[.toast]:!mr-0.5",
          success: "group-[.toaster]:!border-emerald-500/20 group-[.toaster]:!bg-[#E8F5EF] dark:group-[.toaster]:!bg-[#1B3528] group-[.toast]:!text-[#4CAF87] [data-icon]:!text-[#4CAF87]",
          error: "group-[.toaster]:!border-rose-500/20 group-[.toaster]:!bg-[#FDECEA] dark:group-[.toaster]:!bg-[#3A1F1F] group-[.toast]:!text-[#E05C5C] [data-icon]:!text-[#E05C5C]",
          actionButton: "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-xl group-[.toast]:!font-semibold",
          cancelButton: "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-xl group-[.toast]:!font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
