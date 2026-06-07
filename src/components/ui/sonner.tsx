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
          success: "group-[.toaster]:!border-emerald-500/20 group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-background/95 group-[.toaster]:!to-emerald-500/10 group-[.toast]:!text-emerald-600 dark:group-[.toast]:!text-emerald-400 [data-icon]:!text-emerald-500",
          error: "group-[.toaster]:!border-rose-500/20 group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-background/95 group-[.toaster]:!to-rose-500/10 group-[.toast]:!text-rose-600 dark:group-[.toast]:!text-rose-400 [data-icon]:!text-rose-500",
          actionButton: "group-[.toast]:!bg-primary group-[.toast]:!text-primary-foreground group-[.toast]:!rounded-xl group-[.toast]:!font-semibold",
          cancelButton: "group-[.toast]:!bg-muted group-[.toast]:!text-muted-foreground group-[.toast]:!rounded-xl group-[.toast]:!font-semibold",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
