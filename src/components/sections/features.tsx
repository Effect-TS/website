import {Button} from '../atoms/button'
import {Checklist} from '../atoms/checklist'
import {GlowingIcon} from '../atoms/glowing-icon'
import {Divider} from '../layout/divider'

export const Features = () => {
  return (
    <section className="relative">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-8 lg:px-16 pb-24 pt-32 grid grid-cols-1 md:grid-cols-3 gap-16">
        <div>
          <div className="flex items-center gap-3">
            <GlowingIcon name="blocks" />
            <h3 className="font-display text-xl text-white">Powerful building blocks</h3>
          </div>
          <p className="my-6">
            Lorem ipsum dolor sit amet consectetur. Mattis et lacus tortor sed integer nunc mattis suspendisse diam. Eget potenti volutpat non a leo sit.
          </p>
          <Checklist items={['Lorem ipsum dolor sit amet', 'Consectetur augue vitae', 'Rutrum felis neque auctor justo']} />
          <Button href="/docs" secondary className="mt-10">
            Read documentation
          </Button>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <GlowingIcon name="plugs" />
            <h3 className="font-display text-xl text-white">No more one-off dependencies</h3>
          </div>
          <p className="my-6">
            Lorem ipsum dolor sit amet consectetur. Mattis et lacus tortor sed integer nunc mattis suspendisse diam. Eget potenti volutpat non a leo sit.
          </p>
          <Checklist items={['Lorem ipsum dolor sit amet', 'Consectetur augue vitae', 'Rutrum felis neque auctor justo']} />
          <Button href="/docs" secondary className="mt-10">
            Read documentation
          </Button>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <GlowingIcon name="shield" />
            <h3 className="font-display text-xl text-white">Never try & catch again</h3>
          </div>
          <p className="my-6">
            Lorem ipsum dolor sit amet consectetur. Mattis et lacus tortor sed integer nunc mattis suspendisse diam. Eget potenti volutpat non a leo sit.
          </p>
          <Checklist items={['Lorem ipsum dolor sit amet', 'Consectetur augue vitae', 'Rutrum felis neque auctor justo']} />
          <Button href="/docs" secondary className="mt-10">
            Read documentation
          </Button>
        </div>
      </div>
      <Divider />
    </section>
  )
}
