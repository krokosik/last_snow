import { IconButton, IconButtonProps } from "@chakra-ui/react";
import { forwardRef } from "react";
import { DIM } from "../const";

export const ActionButton = forwardRef<typeof IconButton, IconButtonProps>(
  ({ ...props }, ref) => {
    return (
      <IconButton
        ref={ref}
        w="full"
        fontSize="3xl"
        h={DIM.SIDE_BAR}
        textTransform="uppercase"
        {...props}
      />
    );
  }
);
