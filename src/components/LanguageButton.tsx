import { Button, ButtonProps } from "@chakra-ui/react";
import { DIM } from "../const";
import { forwardRef } from "react";

export const LanguageButton = forwardRef<
  typeof Button,
  ButtonProps & { country: string }
>(({ country, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      w="full"
      fontSize="3xl"
      h={DIM.SIDE_BAR}
      aria-label={`${country} keyboard layout`}
      textTransform="uppercase"
      //   icon={<Gb />}
      {...props}
    >
      {country}
    </Button>
  );
});