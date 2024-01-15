import { CheckCircleIcon, CloseIcon } from "@chakra-ui/icons";
import {
  Container,
  Flex,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { invoke } from "@tauri-apps/api";
import { Event, listen } from "@tauri-apps/api/event";
import { appConfigDir } from "@tauri-apps/api/path";
import {
  ChangeEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { info } from "tauri-plugin-log-api";
import { Store } from "tauri-plugin-store-api";
import { DIM, LANGUAGES, LOGIC } from "../const";
import { ActionButton } from "./ActionButton";

export const TextAreaWithControls = forwardRef<
  HTMLTextAreaElement,
  { language: keyof typeof LANGUAGES }
>(({ language }, ref) => {
  const toast = useToast();
  const [text, setText] = useState("");
  const [max_len, setMaxLen] = useState<number>(LOGIC.SENTENCE_LIMIT);
  const [isLoading, setLoading] = useState(false);

  const handleInputChange = useCallback((e: ChangeEvent) => {
    // @ts-ignore
    const inputValue = e.target.value;
    if (
      inputValue.length > LOGIC.SENTENCE_LIMIT ||
      inputValue.split("\n").length > 4
    )
      return;

    setText(inputValue);
  }, []);

  const handleInputClear = useCallback(() => {
    setText("");
  }, []);

  // hack to exit suggestion mode on jp keyboard
  const prepareSubmit = useCallback(() => {
    invoke("key_press");
  }, []);

  const handleSubmit = useCallback(() => {
    if (text.length === 0) return;
    setLoading(true);

    info(`Submitting ${text}`);

    toast.promise(
      invoke("submit_sentence", {
        language,
        text,
      })
        .then(() => {
          setText("");
        })
        .finally(() => {
          setLoading(false);
        }),
      {
        success: {
          title: "Success!",
          description: "Your text has been submitted.",
        },
        loading: { title: "Submitting text..." },
        error: {
          title: "Failure",
          description: "Your text could not be submitted.",
        },
      }
    );
  }, [text, language]);

  const suppressTab = useCallback(
    (e: KeyboardEvent) => {
      console.log(e.key);
      if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === "Enter" && e.shiftKey) {
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  useEffect(() => {
    appConfigDir().then((dir) => {
      new Store(dir + "/.settings").get("max_characters").then((max) => {
        if (max) setMaxLen(+max);
      });
    });
    const unlisten = listen("max_characters", (event: Event<number>) => {
      setMaxLen(event.payload);
    });
    return () => void unlisten.then((u) => u());
  }, []);

  return (
    <>
      <Container flex={1} maxW="container.lg">
        <Flex direction="column" justifyContent="space-between">
          <Textarea
            ref={ref}
            autoFocus
            flex={1}
            rows={4}
            maxLength={max_len}
            value={text}
            isDisabled={isLoading}
            onChange={handleInputChange}
            resize="none"
            fontSize="4xl"
            onKeyDown={suppressTab}
          />
          <Text ml="auto">
            {text.length} / {max_len}
          </Text>
        </Flex>
      </Container>
      <VStack w={DIM.SIDE_BAR} h={DIM.HEIGHT} justifyContent="space-around">
        <ActionButton
          aria-label="Clear textarea"
          colorScheme="red"
          isDisabled={text.length === 0 || isLoading}
          icon={<CloseIcon />}
          onClick={handleInputClear}
        />
        <ActionButton
          isDisabled={text.length < 1}
          isLoading={isLoading}
          colorScheme="green"
          aria-label="Send text"
          onClick={prepareSubmit}
          icon={<CheckCircleIcon />}
        />
      </VStack>
    </>
  );
});
