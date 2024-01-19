import { Kbd, Text } from "@chakra-ui/react";

export const KeyboardHint = ({ language }: { language: string }) => {
  console.log(language);

  if (language === "jp") {
    return (
      <Text>
        <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>.</Kbd> - circle Kana mode{" "}
        <Kbd>Space</Kbd> - circle suggestions
      </Text>
    );
  } else if (language === "cn") {
    return (
      <Text>
        <Kbd>Ctrl</Kbd>+<Kbd>Shift</Kbd>+<Kbd>f</Kbd> toggle
        Traditional/Simplified Chinese
      </Text>
    );
  }

  return <Text></Text>;
};
