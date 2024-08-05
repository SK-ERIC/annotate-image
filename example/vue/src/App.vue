<script setup lang="ts">
import { reactive, ref } from 'vue'
import AnnotateImage from '@annotate-image/vue'

const path = ref([])

const options = reactive({})

function handleInputFn(value: any) {
  console.log(value)
}
</script>

<template>
  <div class="image-box">
    <img src="" alt="" />
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
