import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  SimpleGrid,
  Center,
} from "@chakra-ui/react";
import { LanguageButton } from ".";
import { LANGUAGES } from "../const";
import { Command } from "@tauri-apps/api/shell";
import { RefObject, useCallback } from "react";

export const LanguageDrawer = ({
  kbBtnRef,
  isOpen,
  onClose,
  setLanguage,
  language,
}: {
  kbBtnRef: RefObject<HTMLButtonElement>;
  isOpen: boolean;
  onClose: () => void;
  setLanguage: (lang: keyof typeof LANGUAGES) => void;
  language: keyof typeof LANGUAGES;
}) => {
  const handleLanguageChange = useCallback(
    (lang: keyof typeof LANGUAGES) => () => {
      setLanguage(lang);
      new Command("kb", ["engine", LANGUAGES[lang]]).execute();
    },
    []
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      placement="left"
      finalFocusRef={kbBtnRef}
      size="xs"
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader>Pick keyboard layout</DrawerHeader>
        <DrawerBody>
          <SimpleGrid columns={2} spacing={12} px={5}>
            {Object.keys(LANGUAGES).map((lang) => (
              <Center>
                <LanguageButton
                  aspectRatio={1}
                  key={lang}
                  country={lang}
                  colorScheme="blue"
                  variant={lang === language ? "solid" : "outline"}
                  onClick={handleLanguageChange(lang as any)}
                />
              </Center>
            ))}
          </SimpleGrid>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};
