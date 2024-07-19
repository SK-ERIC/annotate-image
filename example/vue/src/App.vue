<script setup lang="ts">
import { reactive, ref } from "vue";
import AnnotateImage from "@annotate-image/vue";

const path = ref([]);

const options = reactive({});

function handleInputFn(value: any) {
  console.log(value);
}
</script>

<template>
  <div class="image-box">
    <img
      src="https://ljchat.obs.cn-east-3.myhuaweicloud.com/completeRepair/4cd54c21f0454b0118fde7d777b1df1d26bd4dca90db3f6252313c71980665a9_8115531998157993.jpg"
      alt=""
    />
    <annotate-image
      v-model="path"
      :options="options"
      @input="handleInputFn"
    ></annotate-image>
  </div>
</template>

<style scoped>
.image-box {
  width: 600px;
  position: relative;

  img {
    width: 100%;
  }
}
</style>
