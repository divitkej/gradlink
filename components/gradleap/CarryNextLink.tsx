"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { carryNext } from "@/lib/return-path";

/**
 * A link between the sign-in and sign-up pages that keeps `?next=`, so someone
 * who arrived from a scanned QR still goes back to it. The address is read at
 * click time: during a client-side navigation it has not changed yet when the
 * new page renders, so reading it while rendering would miss `next`.
 */
export default function CarryNextLink({ href, ...rest }: React.ComponentProps<typeof Link> & { href: string }) {
  const router = useRouter();
  return (
    <Link
      {...rest}
      href={href}
      onClick={(e) => {
        rest.onClick?.(e);
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        const to = carryNext(href);
        if (to === href) return;
        e.preventDefault();
        router.push(to);
      }}
    />
  );
}
