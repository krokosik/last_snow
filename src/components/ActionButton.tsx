import { IconButton, IconButtonProps } from "@chakra-ui/react";
import { forwardRef } from "react";
import { DIM } from "../const";

export const ActionButton = forwardRef<typeof IconButton, IconButtonProps>(
  ({ ...props }, ref) => {
    return (
      <IconButton
        ref={ref}
        w="50%"
        isRound
        variant={"solid"}
        fontSize={DIM.BTN_FONT_SIZE}
        h={DIM.SIDE_BAR / 2}
        textTransform="uppercase"
        {...props}
      />
    );
  }
);
