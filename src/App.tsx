import { Button, HStack, VStack, useDisclosure } from "@chakra-ui/react";
import { Command } from "@tauri-apps/api/shell";
import { useCallback, useEffect, useRef, useState } from "react";
import { info, warn } from "tauri-plugin-log-api";
import { LanguageDrawer, TextAreaWithControls } from "./components";
import { DIM, LANGUAGES } from "./const";

export default function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kbBtnRef = useRef<HTMLButtonElement>(null);
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en");

  useEffect(() => {
    new Command("kb_check", ["engine"])
      .execute()
      .then((res) => {
        info(`Detected keyboard engine: ${res.stdout}`);
        const lang = Object.entries(LANGUAGES).find(
          ([_, value]) => res.stdout.indexOf(value) !== -1
        )?.[0];

        if (lang) {
          setLanguage(lang as any);
        }
      })
      .catch((err) => {
        warn(`Failed to detect language: ${err}`);
      });
  }, []);

  const handleFocusChange = useCallback(() => {
    textareaRef.current?.focus();
  }, []);

  // Periodically check if textarea is focused
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.activeElement !== textareaRef.current && !isOpen) {
        textareaRef.current?.focus();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  return (
    <>
      <HStack onClick={handleFocusChange}>
        <VStack w={DIM.SIDE_BAR}>
          <Button
            fontSize={DIM.BTN_FONT_SIZE}
            h={DIM.SIDE_BAR / 2}
            w={DIM.SIDE_BAR / 2}
            ref={kbBtnRef as any}
            aria-label="change-keyboard-layout"
            colorScheme="blue"
            textTransform="uppercase"
            onClick={onOpen}
          >
            {language}
          </Button>
        </VStack>
        <TextAreaWithControls language={language} ref={textareaRef} />
      </HStack>
      <LanguageDrawer
        kbBtnRef={kbBtnRef}
        isOpen={isOpen}
        onClose={onClose}
        setLanguage={setLanguage}
        language={language}
      />
    </>
  );
}
