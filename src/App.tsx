import { Icon } from "@chakra-ui/icons";
import { HStack, VStack, useDisclosure } from "@chakra-ui/react";
import { Command } from "@tauri-apps/api/shell";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdOutlineKeyboard } from "react-icons/md";
import { info, warn } from "tauri-plugin-log-api";
import {
  ActionButton,
  LanguageDrawer,
  TextAreaWithControls,
} from "./components";
import { DIM, LANGUAGES } from "./const";

export default function App() {
  const { isOpen, onOpen, onClose } = useDisclosure();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const kbBtnRef = useRef<HTMLButtonElement>(null);
  const [language, setLanguage] = useState<keyof typeof LANGUAGES>("en");

  useEffect(() => {
    new Command("kb", ["engine", ""])
      .execute()
      .then((res) => {
        info(`Detected keyboard engine: ${res.stdout}`);
        const lang = Object.entries(LANGUAGES).find(
          ([_, value]) => value === res.stdout
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
          <ActionButton
            ref={kbBtnRef as any}
            aria-label="change-keyboard-layout"
            colorScheme="blue"
            icon={<Icon as={MdOutlineKeyboard} />}
            onClick={onOpen}
          />
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
