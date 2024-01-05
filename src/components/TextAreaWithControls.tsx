import { CloseIcon, CheckCircleIcon } from "@chakra-ui/icons";
import {
  Container,
  Flex,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { ActionButton } from "./ActionButton";
import { LOGIC, DIM, LANGUAGES } from "../const";
import {
  ChangeEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useEffect,
  useState,
} from "react";
import { invoke } from "@tauri-apps/api";
import { info } from "tauri-plugin-log-api";

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

  const handleSubmit = useCallback(() => {
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

  const suppressTab = useCallback((e: KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  useEffect(() => {
    invoke<string>("get_env_var", { key: "MAX_LEN" }).then((res) => {
      if (+res) {
        setMaxLen(+res);
      }
    });
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
          isDisabled={text.length < 10}
          isLoading={isLoading}
          colorScheme="green"
          aria-label="Send text"
          onClick={handleSubmit}
          icon={<CheckCircleIcon />}
        />
      </VStack>
    </>
  );
});
